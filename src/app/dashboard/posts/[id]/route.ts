import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

import { updatePostSchema } from "@/lib/validators/posts";
import { getAuthedUserId } from "@/lib/server/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";


function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const userId = await getAuthedUserId();
  if (!userId) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const { id } = await ctx.params;

  const post = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      contentMd: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!post) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  return NextResponse.json({ ok: true as const, post });
}

export async function PATCH(_req: Request, ctx: Ctx) {
  const userId = await getAuthedUserId();
  if (!userId) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const { id } = await ctx.params;

  const body = await _req.json().catch(() => null);
  const parsed = updatePostSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  // ensure valid ownership
  const existing = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: { id: true },
  });
  if (!existing) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  try {
    const post = await prisma.post.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        slug: true,
        contentMd: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true as const, post });
  } catch (err) {
    // if the slug is colliding, Prisma throws P2002
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes("slug")) {
        return jsonError(409, ERROR_CODES.SLUG_TAKEN, "That slug is already in use.");
      }
      return jsonError(409, ERROR_CODES.CONFLICT, "Unable to update post.");
    }

    console.error("PATCH /api/posts/[id] error:", err);
    return jsonError(500, ERROR_CODES.INTERNAL_ERROR, "Something went wrong.");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await getAuthedUserId();
  if (!userId) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const { id } = await ctx.params;

  const existing = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: { id: true },
  });
  if (!existing) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true as const });
}
