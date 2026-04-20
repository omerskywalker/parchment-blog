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
  // Concurrency control: per-post advisory lock
  // ------------------------------------------------------------------
  // The endpoint is publicly callable on every published post. Without a
  // lock, N simultaneous "Listen" clicks (e.g. a post going viral) would
  // each fire an independent TTS call and S3 upload — N× the OpenAI spend
  // and last-writer-wins races on the S3 key. We use a Postgres
  // transaction-scoped advisory lock keyed on the post id: the first
  // request gets the lock and runs generation; concurrent requests bounce
  // with a 202 + Retry-After so the client re-polls GET shortly after.
  // pg_try_advisory_xact_lock auto-releases when the transaction ends
  // (commit, rollback, or connection drop), so a stuck/crashed worker
  // can't permanently block regeneration.
  // ------------------------------------------------------------------
  type TxResult =
    | { kind: "in_progress" }
    | {
        kind: "cached" | "generated" | "regenerated";
        key: string;
        charCount: number;
        durationSec: number;
        voice: string;
      };

  let result: TxResult;
  try {
    result = await prisma.$transaction(
      async (tx): Promise<TxResult> => {
        const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
          SELECT pg_try_advisory_xact_lock(hashtextextended(${`audio:${post.id}`}, 0)) AS locked
        `;
        if (!lockRows[0]?.locked) {
          return { kind: "in_progress" };
        }

        // Re-read inside the lock — another worker that won the race may
        // have already generated fresh audio while we were waiting on the
        // initial post lookup.
        const fresh = await tx.postAudio.findUnique({
          where: { postId: post.id },
        });
        if (fresh && fresh.voice === DEFAULT_VOICE) {
          const drift =
            Math.abs(input.length - fresh.charCount) /
            Math.max(fresh.charCount, 1);
          if (drift <= STALE_DELTA_RATIO) {
            return {
              kind: "cached",
              key: fresh.audioKey,
              charCount: fresh.charCount,
              durationSec: fresh.durationSec,
              voice: fresh.voice,
            };
          }
        }

        // Generate. Errors here roll back the transaction (which releases
        // the advisory lock); the catch outside surfaces a 502.
        const mp3 = await generateNarrationMp3(input, DEFAULT_VOICE);
        const key = audioObjectKey(post.id, DEFAULT_VOICE);
        await putAudioObject(key, mp3);
        const durationSec = estimateMp3DurationSec(mp3.byteLength);
        const charCount = input.length;

        await tx.postAudio.upsert({
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

        return {
          kind: post.audio ? "regenerated" : "generated",
          key,
          charCount,
          durationSec,
          voice: DEFAULT_VOICE,
        };
      },
      // Cover slow TTS (~10-30s for a full post) + S3 upload comfortably,
      // but stay under the route's maxDuration so we surface a clean 502
      // rather than a function timeout.
      { timeout: 55_000, maxWait: 5_000 },
    );
  } catch (err) {
    console.error("[audio/generate] transaction failed:", err);
    return NextResponse.json(
      {
        ok: false,
        status: "tts_failed",
        message: "Audio generation failed.",
      },
      { status: 502 },
    );
  }

  if (result.kind === "in_progress") {
    return NextResponse.json(
      {
        ok: false,
        status: "in_progress",
        message: "Audio is being generated for this post; try again shortly.",
      },
      { status: 202, headers: { "Retry-After": "5" } },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.kind,
    audioUrl: audioPublicUrlVersioned(result.key, result.charCount, result.durationSec),
    durationSec: result.durationSec,
    voice: result.voice,
  });
}
