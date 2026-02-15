import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetVisitorId } from "@/lib/server/visitor";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json({ ok: false as const, error, message }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const visitorId = await getOrSetVisitorId();

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!post) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  const existing = await prisma.postReaction.findUnique({
    where: {
      postId_visitorId_kind: { postId: post.id, visitorId, kind: "FIRE" },
    },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.postReaction.delete({ where: { id: existing.id } });
      const updated = await tx.post.update({
        where: { id: post.id },
        data: { fireCount: { decrement: 1 } },
        select: { fireCount: true },
      });
      return { fired: false, fireCount: updated.fireCount };
    } else {
      await tx.postReaction.create({
        data: { postId: post.id, visitorId, kind: "FIRE" },
        select: { id: true },
      });
      const updated = await tx.post.update({
        where: { id: post.id },
        data: { fireCount: { increment: 1 } },
        select: { fireCount: true },
      });
      return { fired: true, fireCount: updated.fireCount };
    }
  });

  return NextResponse.json({ ok: true as const, firedByMe: result.fired, fireCount: result.fireCount });
}
