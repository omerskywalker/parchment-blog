import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetVisitorId } from "@/lib/server/visitor";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json({ ok: false as const, error, message }, { status });
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const visitorId = await getOrSetVisitorId();

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, viewCount: true, fireCount: true },
  });

  if (!post) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  const fired = await prisma.postReaction.findUnique({
    where: {
      postId_visitorId_kind: { postId: post.id, visitorId, kind: "FIRE" },
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true as const,
    viewCount: post.viewCount,
    fireCount: post.fireCount,
    firedByMe: Boolean(fired),
  });
}
