import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { isOpenAIConfigured } from "@/lib/server/openai";
import {
  DEFAULT_VOICE,
  estimateMp3DurationSec,
  generateNarrationMp3,
  type NarrationVoice,
} from "@/lib/server/tts";
import {
  audioObjectKey,
  audioSegmentObjectKey,
  putAudioObject,
} from "@/lib/server/audioStorage";
import {
  chunkNarrationText,
  isNarratable,
  markdownToNarrationText,
  type NarrationChunk,
  prepareNarrationInput,
} from "@/lib/audioText";

/**
 * Audio generation pipeline. Extracted from
 * /api/posts/[slug]/audio/generate so it can be reused by:
 *   - the on-publish hook in dashboard/posts mutations,
 *   - the daily backfill cron,
 *   - the original on-demand POST endpoint.
 *
 * The pipeline is split into two halves:
 *   1. `claimAudioGeneration` — fast, idempotent. Inspects the post,
 *      returns "ready"/"pending"/"ineligible"/"not_found" without side
 *      effects, OR upserts a PENDING claim row and returns "claimed"
 *      with the prepared narration text.
 *   2. `runAudioGeneration` — slow. The actual TTS + S3 upload.
 *
 * Callers decide how to invoke (2): the on-demand route uses
 * `after()` so the response flushes first; the cron does the same.
 *
 * As of the multi-chunk rewrite, `runAudioGeneration` always writes
 * the `segments` JSON column (even for single-chunk posts), and
 * mirrors the first segment into the legacy `audioKey`/`durationSec`
 * fields so any unmigrated reader keeps working.
 */

/** When a post's text drifts more than this fraction from the cached
 *  narration's char count, we treat the audio as stale and regenerate. */
const STALE_DELTA_RATIO = 0.02;

/** How many TTS calls to fire concurrently per generation. tts-1 has
 *  generous rate limits; 3 keeps wall-clock low without saturating
 *  Vercel's outbound connections or our function memory. */
const TTS_CONCURRENCY = 3;

/** Per-chunk retry budget for TTS calls. Transient 5xxs / network
 *  blips are common at this volume — a quick retry pair recovers
 *  most of them. We back off a constant 750ms between attempts. */
const TTS_RETRY_ATTEMPTS = 3;
const TTS_RETRY_BACKOFF_MS = 750;

/** Persisted shape of the `segments` JSON column. Mirrors
 *  NarrationChunk plus the bits the player needs at runtime. */
export type StoredSegment = {
  key: string;
  durationSec: number;
  charCount: number;
  overlapChars: number;
};

export type ClaimResult =
  | { kind: "ready" }
  | { kind: "pending" }
  | { kind: "ineligible" }
  | { kind: "not_configured" }
  | { kind: "not_found" }
  | { kind: "claimed"; postId: string; input: string; voice: NarrationVoice };

export type ClaimOptions = {
  /** When true, bypass the "ready + within drift" cache hit and the
   *  in-flight PENDING short-circuit, always claiming a fresh run.
   *  Used by force-regen entry points (cron ?force=1, generate
   *  ?force=1) — both gated by the CRON_SECRET Bearer header so
   *  random callers can't burn TTS quota. */
  force?: boolean;
  voice?: NarrationVoice;
};

/**
 * Inspect a post and decide whether audio work is needed. Idempotent
 * for callers — multiple cron runs against the same post will each
 * see "pending" or "ready" once one has won the claim.
 *
 * Pure side effect: a single Prisma upsert when the result is
 * "claimed". No TTS, no S3, no `after()`.
 */
export async function claimAudioGeneration(
  slug: string,
  options: ClaimOptions = {},
): Promise<ClaimResult> {
  if (!isOpenAIConfigured()) {
    return { kind: "not_configured" };
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      contentMd: true,
      publishedAt: true,
      audio: {
        select: {
          status: true,
          audioKey: true,
          voice: true,
          durationSec: true,
          charCount: true,
        },
      },
    },
  });

  if (!post || !post.publishedAt) {
    return { kind: "not_found" };
  }

  const text = markdownToNarrationText(post.contentMd);
  if (!isNarratable(text)) {
    return { kind: "ineligible" };
  }

  const input = prepareNarrationInput(text);
  const voice = options.voice ?? DEFAULT_VOICE;

  // Cache hit — fresh ready audio for the requested voice. Skipped
  // under `force` so manual re-triggers always rebuild even when
  // nothing about the source changed (e.g. testing a chunker tweak).
  if (
    !options.force &&
    post.audio &&
    post.audio.status === "READY" &&
    post.audio.voice === voice &&
    post.audio.audioKey &&
    post.audio.charCount != null &&
    post.audio.durationSec != null
  ) {
    const drift =
      Math.abs(input.length - post.audio.charCount) /
      Math.max(post.audio.charCount, 1);
    if (drift <= STALE_DELTA_RATIO) {
      return { kind: "ready" };
    }
    // else fall through to claim — content drifted, regenerate.
  }

  // Already in flight from another caller. Force callers ignore this
  // too — operationally, force is the escape hatch for a stuck
  // PENDING that didn't actually complete (rare crash mid-run).
  if (!options.force && post.audio?.status === "PENDING") {
    return { kind: "pending" };
  }

  // Claim the slot. Unique postId guarantees one row per post even
  // if two callers race; the worst case is one redundant TTS call.
  await prisma.postAudio.upsert({
    where: { postId: post.id },
    create: {
      postId: post.id,
      voice,
      status: "PENDING",
    },
    update: {
      voice,
      status: "PENDING",
      audioKey: null,
      durationSec: null,
      charCount: null,
      // Prisma requires explicit JsonNull (vs DbNull) for nullable
      // JSONB columns in update payloads — plain `null` would be
      // a type error.
      segments: Prisma.JsonNull,
      error: null,
    },
  });

  return { kind: "claimed", postId: post.id, input, voice };
}

/**
 * Generate one chunk's MP3 with bounded retries. Throws after the
 * final attempt — caller decides whether one chunk's failure should
 * sink the whole post (yes — partial audio is worse than no audio).
 */
async function generateChunkWithRetries(
  chunk: NarrationChunk,
  voice: NarrationVoice,
  attempts: number = TTS_RETRY_ATTEMPTS,
): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await generateNarrationMp3(chunk.text, voice);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, TTS_RETRY_BACKOFF_MS));
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("TTS generation failed after retries");
}

/**
 * Run the chunk pipeline with bounded concurrency. Index-preserving:
 * results[i] corresponds to chunks[i] regardless of completion order.
 * Any chunk failure (after retries) bubbles up so the caller marks
 * the row FAILED — we don't ship partial audio.
 */
async function generateAllChunks(
  chunks: NarrationChunk[],
  voice: NarrationVoice,
  concurrency: number = TTS_CONCURRENCY,
): Promise<Buffer[]> {
  const results: Buffer[] = new Array(chunks.length);
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(concurrency, chunks.length); w++) {
    workers.push(
      (async () => {
        while (true) {
          const i = cursor++;
          if (i >= chunks.length) return;
          results[i] = await generateChunkWithRetries(chunks[i], voice);
        }
      })(),
    );
  }
  await Promise.all(workers);
  return results;
}

/**
 * The slow half: TTS → S3 → mark READY (or FAILED on error).
 * Designed to be called from `after()` so it doesn't block any
 * HTTP response. Never throws — failures are persisted to the row
 * so retries / observability still work.
 *
 * Multi-chunk pipeline:
 *   1. chunkNarrationText splits `input` into sentence-aligned pieces
 *      under the per-call ceiling, with overlapping context sentences
 *      between adjacent chunks.
 *   2. We TTS each chunk in parallel (TTS_CONCURRENCY at a time) with
 *      per-chunk retries.
 *   3. Each MP3 is written to its own S3 key (audio/<postId>/<voice>-<i>.mp3).
 *   4. The `segments` JSON column gets the ordered metadata; legacy
 *      audioKey/durationSec/charCount mirror chunk 0 + the totals so
 *      any unmigrated reader still finds something to play.
 */
export async function runAudioGeneration(
  postId: string,
  input: string,
  voice: NarrationVoice = DEFAULT_VOICE,
): Promise<void> {
  try {
    const chunks = chunkNarrationText(input);
    if (chunks.length === 0) {
      throw new Error("Narration input produced no chunks");
    }

    const mp3s = await generateAllChunks(chunks, voice);

    // Upload all segments in parallel — these are independent S3 PUTs.
    const segments: StoredSegment[] = await Promise.all(
      chunks.map(async (chunk, i) => {
        const key = audioSegmentObjectKey(postId, voice, i);
        await putAudioObject(key, mp3s[i]);
        return {
          key,
          durationSec: estimateMp3DurationSec(mp3s[i].byteLength),
          charCount: chunk.charCount,
          overlapChars: chunk.overlapChars,
        };
      }),
    );

    // Aggregate totals for the legacy columns. Effective duration
    // subtracts each chunk's overlap so a single-number "total" matches
    // what the player will display (overlap is heard once, not twice).
    const totalDurationSec = segments.reduce((acc, seg) => {
      const overlapDur = seg.charCount > 0
        ? Math.round((seg.overlapChars / seg.charCount) * seg.durationSec)
        : 0;
      return acc + Math.max(0, seg.durationSec - overlapDur);
    }, 0);

    await prisma.postAudio.update({
      where: { postId },
      data: {
        status: "READY",
        // Mirror chunk 0 into the legacy audioKey so old clients still
        // play *something* (the first chunk only). New clients prefer
        // `segments` and get the full narration.
        audioKey: segments[0].key,
        durationSec: totalDurationSec,
        charCount: input.length,
        segments,
        error: null,
      },
    });
  } catch (err) {
    console.error("[audioPipeline] background worker failed:", err);
    const message = err instanceof Error ? err.message : "Audio generation failed.";
    try {
      await prisma.postAudio.update({
        where: { postId },
        data: {
          status: "FAILED",
          error: message.slice(0, 500),
        },
      });
    } catch (writeErr) {
      console.error("[audioPipeline] failed to record FAILED status:", writeErr);
    }
  }
}

/** Re-export so callers stop reaching across modules for the legacy
 *  helper — useful if we ever swap the back-compat key scheme. */
export { audioObjectKey };
