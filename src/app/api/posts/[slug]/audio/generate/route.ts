import { NextResponse, after } from "next/server";
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
/**
 * The producer half of this route is fast — it just upserts a PENDING
 * claim row and returns. The actual TTS+S3 work runs via `after()`, which
 * gets its own ~5 minute background budget on Vercel after the response
 * is sent. We still set a generous maxDuration so the background callback
 * has plenty of headroom for slow OpenAI calls on long posts.
 */
export const maxDuration = 300;

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
  // Cache hit — fresh ready audio already exists. Return immediately
  // so the client can play without polling.
  // ------------------------------------------------------------------
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
      return NextResponse.json({
        ok: true,
        status: "ready" as const,
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
  // Already in flight — another request claimed this post and a worker
  // is generating right now. Tell the client to poll. (Best-effort
  // dedup; without a distributed lock two concurrent first-hit POSTs
  // could each upsert PENDING in quick succession, but the worst case
  // is one redundant TTS call — the unique postId constraint guarantees
  // no duplicate rows.)
  // ------------------------------------------------------------------
  if (post.audio?.status === "PENDING") {
    return NextResponse.json(
      { ok: true, status: "pending" as const },
      { status: 202 },
    );
  }

  // ------------------------------------------------------------------
  // Claim: upsert to PENDING and clear stale audio fields. Then kick
  // off the background worker via `after()` and return 202.
  // ------------------------------------------------------------------
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

  after(async () => {
    await runAudioGeneration(post.id, input);
  });

  return NextResponse.json(
    { ok: true, status: "pending" as const },
    { status: 202 },
  );
}

/**
 * Background worker: TTS → S3 → mark READY (or FAILED on error).
 *
 * Runs via `after()` so it executes after the HTTP response is flushed.
 * Vercel keeps the function alive for `maxDuration` seconds total
 * (response time + after() time), giving the slow OpenAI call enough
 * headroom even for long posts.
 */
async function runAudioGeneration(postId: string, input: string): Promise<void> {
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
    console.error("[audio/generate] background worker failed:", err);
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
      console.error("[audio/generate] failed to record FAILED status:", writeErr);
    }
  }
}
