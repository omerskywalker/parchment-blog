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
import {
  decodeStoredSegments,
  toWireSegments,
} from "../route";

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

/**
 * Force-regen requests (`?force=1`) bypass the "READY cache hit" and
 * "PENDING in-flight" short-circuits in claimAudioGeneration. They
 * burn TTS quota and trigger a fresh generation regardless of state,
 * so we gate them behind the same Bearer token Vercel uses for cron
 * (CRON_SECRET). Operators can manually re-trigger from a terminal:
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://parchment.blog/api/posts/<slug>/audio/generate?force=1"
 *
 * In dev/CI without CRON_SECRET set we permit force without a header
 * so test runs and local debugging stay frictionless.
 */
function isAuthorizedForForce(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(req.url);
  const wantForce = url.searchParams.get("force") === "1";
  if (wantForce && !isAuthorizedForForce(req)) {
    return NextResponse.json(
      { ok: false, status: "unauthorized" as const },
      { status: 401 },
    );
  }

  const claim = await claimAudioGeneration(slug, { force: wantForce });

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
            select: {
              audioKey: true,
              durationSec: true,
              charCount: true,
              voice: true,
              segments: true,
            },
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
      const stored = decodeStoredSegments(a.segments);
      const segments = stored ? toWireSegments(stored) : null;
      return NextResponse.json({
        ok: true,
        status: "ready" as const,
        audioUrl: audioPublicUrlVersioned(a.audioKey, a.charCount, a.durationSec),
        durationSec: a.durationSec,
        voice: a.voice ?? DEFAULT_VOICE,
        segments,
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
