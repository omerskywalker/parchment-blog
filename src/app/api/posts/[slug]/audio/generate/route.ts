import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isOpenAIConfigured } from "@/lib/server/openai";
import {
  DEFAULT_VOICE,
  estimateMp3DurationSec,
  generateNarrationMp3,
} from "@/lib/server/tts";
import {
  audioObjectKey,
  audioPublicUrlVersioned,
  putAudioObject,
} from "@/lib/server/audioStorage";
import {
  isNarratable,
  markdownToNarrationText,
  prepareNarrationInput,
} from "@/lib/audioText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** TTS calls can take 10-30s for long posts; lift the default function timeout. */
export const maxDuration = 60;

const STALE_DELTA_RATIO = 0.02;

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        status: "not_configured",
        message:
          "TTS is not configured on this environment. Set OPENAI_API_KEY (or the AI_INTEGRATIONS_OPENAI_* pair) and redeploy.",
      },
      { status: 503 },
    );
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      contentMd: true,
      publishedAt: true,
      audio: {
        select: { audioKey: true, voice: true, durationSec: true, charCount: true },
      },
    },
  });

  if (!post || !post.publishedAt) {
    return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
  }

  const text = markdownToNarrationText(post.contentMd);
  if (!isNarratable(text)) {
    return NextResponse.json(
      { ok: false, status: "ineligible", message: "Post is too short to narrate." },
      { status: 422 },
    );
  }

  const input = prepareNarrationInput(text);

  // ------------------------------------------------------------------
  // Cache check (no transaction needed for a single read)
  // ------------------------------------------------------------------
  if (post.audio && post.audio.voice === DEFAULT_VOICE) {
    const drift =
      Math.abs(input.length - post.audio.charCount) /
      Math.max(post.audio.charCount, 1);
    if (drift <= STALE_DELTA_RATIO) {
      return NextResponse.json({
        ok: true,
        status: "cached" as const,
        audioUrl: audioPublicUrlVersioned(
          post.audio.audioKey,
          post.audio.charCount,
          post.audio.durationSec,
        ),
        durationSec: post.audio.durationSec,
        voice: post.audio.voice,
      });
    }
  }

  // ------------------------------------------------------------------
  // Generate (no surrounding transaction)
  // ------------------------------------------------------------------
  // The previous version wrapped TTS + S3 + upsert in a Prisma
  // `$transaction` so we could hold a per-post advisory lock for the
  // full duration and prevent concurrent first-hit requests from each
  // calling OpenAI ("thundering herd"). But Supabase's transaction-mode
  // pgbouncer closes the tx around the 55-60s mark, and a long post can
  // push TTS + upload past that, causing P2028 "Transaction already
  // closed" failures (see commit history).
  //
  // Trade-off accepted for v1: drop the lock, accept that two readers
  // who click "Listen" within ~30s of each other on a fresh post may
  // each trigger a generation. Worst-case duplicate cost is ~$0.06 per
  // collision (4k chars × $0.015 / 1k). Both writes hit the same stable
  // S3 key so there is no orphaned storage; last-writer-wins on the
  // PostAudio row, and the Postgres unique constraint on `postId`
  // guarantees we never end up with duplicate rows.
  //
  // TODO(scale): when traffic grows, reintroduce a distributed lock via
  // Vercel KV or Upstash Redis (SET NX with short TTL + 202 fallback)
  // so we can safely deduplicate without holding a long-lived database
  // transaction across the network round-trips.
  // ------------------------------------------------------------------

  let mp3: Buffer;
  try {
    mp3 = await generateNarrationMp3(input, DEFAULT_VOICE);
  } catch (err) {
    console.error("[audio/generate] TTS failed:", err);
    return NextResponse.json(
      { ok: false, status: "tts_failed", message: "Audio generation failed." },
      { status: 502 },
    );
  }

  const key = audioObjectKey(post.id, DEFAULT_VOICE);
  try {
    await putAudioObject(key, mp3);
  } catch (err) {
    console.error("[audio/generate] S3 upload failed:", err);
    return NextResponse.json(
      { ok: false, status: "storage_failed", message: "Audio upload failed." },
      { status: 502 },
    );
  }

  const durationSec = estimateMp3DurationSec(mp3.byteLength);
  const charCount = input.length;

  try {
    await prisma.postAudio.upsert({
      where: { postId: post.id },
      create: {
        postId: post.id,
        voice: DEFAULT_VOICE,
        audioKey: key,
        durationSec,
        charCount,
      },
      update: {
        voice: DEFAULT_VOICE,
        audioKey: key,
        durationSec,
        charCount,
      },
    });
  } catch (err) {
    // The audio object is already in S3 at this point; surface the DB
    // failure but don't try to delete from S3 — the next request will
    // either find the orphan via key collision (and overwrite) or, if
    // the upsert succeeds next time, the URL will already work.
    console.error("[audio/generate] PostAudio upsert failed:", err);
    return NextResponse.json(
      { ok: false, status: "db_failed", message: "Audio metadata save failed." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: post.audio ? ("regenerated" as const) : ("generated" as const),
    audioUrl: audioPublicUrlVersioned(key, charCount, durationSec),
    durationSec,
    voice: DEFAULT_VOICE,
  });
}
