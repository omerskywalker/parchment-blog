import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audioPublicUrl } from "@/lib/server/audioStorage";
import { isNarratable, markdownToNarrationText } from "@/lib/audioText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * If the current narratable text drifts more than this fraction from the
 * stored charCount, treat the cached audio as stale. Small typo fixes
 * shouldn't trigger regeneration; structural rewrites should.
 */
const STALE_DELTA_RATIO = 0.02;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

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

  if (!post.audio) {
    return NextResponse.json({ ok: false, status: "missing" }, { status: 404 });
  }

  const text = markdownToNarrationText(post.contentMd);
  if (!isNarratable(text)) {
    return NextResponse.json({ ok: false, status: "ineligible" }, { status: 422 });
  }

  const drift =
    Math.abs(text.length - post.audio.charCount) /
    Math.max(post.audio.charCount, 1);

  if (drift > STALE_DELTA_RATIO) {
    return NextResponse.json({ ok: false, status: "stale" }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    status: "cached" as const,
    audioUrl: audioPublicUrl(post.audio.audioKey),
    durationSec: post.audio.durationSec,
    voice: post.audio.voice,
  });
}
