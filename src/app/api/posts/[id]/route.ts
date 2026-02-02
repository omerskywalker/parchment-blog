import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { updatePostSchema } from "@/lib/validators/posts";
import { requireUserAndPostId, type IdCtx, jsonError } from "@/lib/server/route-helpers";
import { ERROR_CODES } from "@/lib/server/error-codes";

export async function GET(_req: Request, ctx: IdCtx) {
  const auth = await requireUserAndPostId(ctx);
  if (!auth.ok) return auth.res;

  const { userId, id } = auth;

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

export async function PATCH(req: Request, ctx: IdCtx) {
  const auth = await requireUserAndPostId(ctx);
  if (!auth.ok) return auth.res;

  const { userId, id } = auth;

  const body = await req.json().catch(() => null);
  const parsed = updatePostSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  // ensure valid ownership
  const existing = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: { id: true, slug: true, publishedAt: true },
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

    // revalidate public caches if the post *was* public OR *is now* public OR the slug changed
    const wasPublic = Boolean(existing.publishedAt);
    const isPublic = Boolean(post.publishedAt);
    const slugChanged = existing.slug !== post.slug;

    if (wasPublic || isPublic || slugChanged) {
      revalidateTag("public-posts", "default");
      revalidateTag(`public-post:${existing.slug}`, "default");
      revalidateTag(`public-post:${post.slug}`, "default");
    }


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

export async function DELETE(_req: Request, ctx: IdCtx) {
  const auth = await requireUserAndPostId(ctx);
  if (!auth.ok) return auth.res;

  const { userId, id } = auth;

  const existing = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: { id: true, slug: true, publishedAt: true },
  });
  if (!existing) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  await prisma.post.delete({ where: { id } });

  if (existing.publishedAt) {
    revalidateTag("public-posts", "default");
    revalidateTag(`public-post:${existing.slug}`, "default");
  }

  return NextResponse.json({ ok: true as const });
}
