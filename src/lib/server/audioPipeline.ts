import { prisma } from "@/lib/db";
import { isOpenAIConfigured } from "@/lib/server/openai";
import {
  DEFAULT_VOICE,
  estimateMp3DurationSec,
  generateNarrationMp3,
} from "@/lib/server/tts";
import { audioObjectKey, putAudioObject } from "@/lib/server/audioStorage";
import {
  isNarratable,
  markdownToNarrationText,
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
 */

/** When a post's text drifts more than this fraction from the cached
 *  narration's char count, we treat the audio as stale and regenerate. */
const STALE_DELTA_RATIO = 0.02;

export type ClaimResult =
  | { kind: "ready" }
  | { kind: "pending" }
  | { kind: "ineligible" }
  | { kind: "not_configured" }
  | { kind: "not_found" }
  | { kind: "claimed"; postId: string; input: string };

/**
 * Inspect a post and decide whether audio work is needed. Idempotent
 * for callers — multiple cron runs against the same post will each
 * see "pending" or "ready" once one has won the claim.
 *
 * Pure side effect: a single Prisma upsert when the result is
 * "claimed". No TTS, no S3, no `after()`.
 */
export async function claimAudioGeneration(slug: string): Promise<ClaimResult> {
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

  // Cache hit — fresh ready audio for the default voice.
  if (
    post.audio &&
    post.audio.status === "READY" &&
    post.audio.voice === DEFAULT_VOICE &&
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

  // Already in flight from another caller.
  if (post.audio?.status === "PENDING") {
    return { kind: "pending" };
  }

  // Claim the slot. Unique postId guarantees one row per post even
  // if two callers race; the worst case is one redundant TTS call.
  await prisma.postAudio.upsert({
    where: { postId: post.id },
    create: {
      postId: post.id,
      voice: DEFAULT_VOICE,
      status: "PENDING",
    },
    update: {
      voice: DEFAULT_VOICE,
      status: "PENDING",
      audioKey: null,
      durationSec: null,
      charCount: null,
      error: null,
    },
  });

  return { kind: "claimed", postId: post.id, input };
}

/**
 * The slow half: TTS → S3 → mark READY (or FAILED on error).
 * Designed to be called from `after()` so it doesn't block any
 * HTTP response. Never throws — failures are persisted to the row
 * so retries / observability still work.
 */
export async function runAudioGeneration(
  postId: string,
  input: string,
): Promise<void> {
  try {
    const mp3 = await generateNarrationMp3(input, DEFAULT_VOICE);
    const key = audioObjectKey(postId, DEFAULT_VOICE);
    await putAudioObject(key, mp3);

    await prisma.postAudio.update({
      where: { postId },
      data: {
        status: "READY",
        audioKey: key,
        durationSec: estimateMp3DurationSec(mp3.byteLength),
        charCount: input.length,
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
