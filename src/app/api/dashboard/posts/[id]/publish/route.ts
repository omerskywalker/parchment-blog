import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { publishPostSchema } from "@/lib/validators/posts";
import { requireUserAndPostId, type IdCtx, jsonError } from "@/lib/server/route-helpers";
import { ERROR_CODES } from "@/lib/server/error-codes";

export async function PATCH(req: Request, ctx: IdCtx) {
  const auth = await requireUserAndPostId(ctx);
  if (!auth.ok) return auth.res;

  const { userId, id } = auth;

  const body = await req.json().catch(() => null);
  const parsed = publishPostSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  // ensure valid ownership
  const existing = await prisma.post.findFirst({
    where: { id, authorId: userId },
    select: { id: true },
  });

  if (!existing) return jsonError(404, ERROR_CODES.NOT_FOUND, "Post not found.");

  const publishedAt = parsed.data.published ? new Date() : null;

  const post = await prisma.post.update({
    where: { id },
    data: { publishedAt },
    select: {
      id: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

    revalidateTag("public-posts", "default");
    revalidateTag(`public-post:${post.slug}`, "default");

  return NextResponse.json({ ok: true as const, post });
}
