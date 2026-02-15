import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json({ ok: false as const, error, message }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  try {
    const post = await prisma.post.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
      select: { slug: true, viewCount: true },
    });

    return NextResponse.json({ ok: true as const, slug: post.slug, viewCount: post.viewCount });
  } catch {
    return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");
  }
}
