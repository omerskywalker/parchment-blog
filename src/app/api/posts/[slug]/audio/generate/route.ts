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
  audioPublicUrl,
  putAudioObject,
} from "@/lib/server/audioStorage";
import {
  MAX_NARRATION_CHARS,
  isNarratable,
  markdownToNarrationText,
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
        select: {
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

  // Cap input to a safe per-call size for tts-1. Cut on a word boundary.
  let input = text;
  if (input.length > MAX_NARRATION_CHARS) {
    const cutAt = input.lastIndexOf(" ", MAX_NARRATION_CHARS);
    input = input.slice(0, cutAt > 0 ? cutAt : MAX_NARRATION_CHARS);
  }

  // Fast path: existing audio is fresh + same voice → skip regeneration.
  if (post.audio && post.audio.voice === DEFAULT_VOICE) {
    const drift =
      Math.abs(input.length - post.audio.charCount) /
      Math.max(post.audio.charCount, 1);
    if (drift <= STALE_DELTA_RATIO) {
      return NextResponse.json({
        ok: true,
        status: "cached" as const,
        audioUrl: audioPublicUrl(post.audio.audioKey),
        durationSec: post.audio.durationSec,
        voice: post.audio.voice,
      });
    }
  }

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

  await prisma.postAudio.upsert({
    where: { postId: post.id },
    create: {
      postId: post.id,
      voice: DEFAULT_VOICE,
      audioKey: key,
      durationSec,
      charCount: input.length,
    },
    update: {
      voice: DEFAULT_VOICE,
      audioKey: key,
      durationSec,
      charCount: input.length,
    },
  });

  return NextResponse.json({
    ok: true,
    status: post.audio ? ("regenerated" as const) : ("generated" as const),
    audioUrl: audioPublicUrl(key),
    durationSec,
    voice: DEFAULT_VOICE,
  });
}
