import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_VOICE } from "@/lib/server/tts";
import {
  audioPublicUrlVersioned,
} from "@/lib/server/audioStorage";
import {
  claimAudioGeneration,
  runAudioGeneration,
} from "@/lib/server/audioPipeline";

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

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;
  const claim = await claimAudioGeneration(slug);

  switch (claim.kind) {
    case "not_configured":
      return NextResponse.json(
        {
          ok: false,
          status: "not_configured" as const,
          message:
            "TTS is not configured on this environment. Set OPENAI_API_KEY (or the AI_INTEGRATIONS_OPENAI_* pair) and redeploy.",
        },
        { status: 503 },
      );

    case "not_found":
      return NextResponse.json(
        { ok: false, status: "not_found" as const },
        { status: 404 },
      );

    case "ineligible":
      return NextResponse.json(
        {
          ok: false,
          status: "ineligible" as const,
          message: "Post is too short to narrate.",
        },
        { status: 422 },
      );

    case "ready": {
      // Re-fetch the audio row to assemble the public URL — claim
      // returned "ready" so the row is guaranteed to be complete.
      const post = await prisma.post.findUnique({
        where: { slug },
        select: {
          audio: {
            select: { audioKey: true, durationSec: true, charCount: true, voice: true },
          },
        },
      });
      const a = post?.audio;
      if (!a || !a.audioKey || a.charCount == null || a.durationSec == null) {
        // Lost a race with a regeneration claim — tell client to poll.
        return NextResponse.json(
          { ok: true, status: "pending" as const },
          { status: 202 },
        );
      }
      return NextResponse.json({
        ok: true,
        status: "ready" as const,
        audioUrl: audioPublicUrlVersioned(a.audioKey, a.charCount, a.durationSec),
        durationSec: a.durationSec,
        voice: a.voice ?? DEFAULT_VOICE,
      });
    }

    case "pending":
      return NextResponse.json(
        { ok: true, status: "pending" as const },
        { status: 202 },
      );

    case "claimed":
      after(async () => {
        await runAudioGeneration(claim.postId, claim.input);
      });
      return NextResponse.json(
        { ok: true, status: "pending" as const },
        { status: 202 },
      );
  }
}
