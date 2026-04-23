import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/posts/:slug/audio/listen
 *
 * Increments PostAudio.listenCount by 1 for the given post slug. Called
 * once per playback session by PostAudioPlayer's onPlay handler, gated
 * by the same `trackedStartRef` that gates the `audio_listen_start`
 * analytics event — so pause/resume within a session does not double-count.
 *
 * Intentionally permissive: no auth, no rate limit. The metric this feeds
 * (the author's "Listens" tile on their own dashboard) is informational and
 * cheap; we'd rather miss a few writes than block playback. If listen
 * counts ever drive billing or moderation, harden this with a session
 * fingerprint and an upsert against a dedicated event table.
 *
 * Returns 204 on success, 404 if the post (or its audio row) doesn't exist.
 */
export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;

  // Resolve postId via slug, then bump the audio row. Two queries (rather
  // than a single UPDATE...FROM) so we can return a clean 404 for posts
  // that don't have an audio row yet — the player shouldn't be calling
  // this in that case, but log-friendly errors beat silent no-ops.
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, audio: { select: { id: true } } },
  });

  if (!post || !post.audio) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.postAudio.update({
    where: { postId: post.id },
    data: { listenCount: { increment: 1 } },
  });

  return new NextResponse(null, { status: 204 });
}
