import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { z } from 'zod';
import { getSession } from "@/lib/auth";
import { createPostSchema, slugify } from "@/lib/validators/posts";

function jsonError(
  status: number,
  error: string,
  message?: string,
  issues?: unknown
) {
  return NextResponse.json(
    { ok: false as const, error, message, issues },
    { status }
  );
}

export async function POST(req: Request) {
  // 1) auth gate (server-trusted)
  const session = await getSession();
  const email = session?.user?.email;

  if (!email) {
    return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
  }

  // 2) parse + validate payload
  const body = await req.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid input.", z.treeifyError(parsed.error));
  }

  const { title, contentMd, slug: providedSlug } = parsed.data;

  // 3) determine slug (client can provide or we generate from title)
  const baseSlug = providedSlug ?? slugify(title);

  if (!baseSlug) {
    return jsonError(400, "VALIDATION_ERROR", "Unable to generate slug from title.");
  }

  // 4) find the user (author) by session email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    // this can happen if DB was reset but cookie still exists
    return jsonError(401, "UNAUTHORIZED", "Account not found. Please sign in again.");
  }

  // 5) create the post as a draft (publishedAt null)
  // - slug collision strategy:
  // ---- try baseSlug
  // ---- if unique constraint fails, append -2, -3, etc (bounded attempts)

  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    try {
      const post = await prisma.post.create({
        data: {
          title,
          slug,
          contentMd,
          authorId: user.id,
          publishedAt: null,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ ok: true as const, post }, { status: 201 });
    } catch (err) {
      // unique constraint collision
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // if it's NOT a slug collision, then bubble up
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (!target.includes("slug")) {
          return jsonError(409, "CONFLICT", "Conflict creating post.");
        }

        // else: keep looping to try the next slug
        continue;
      }

      console.error("POST /api/posts error:", err);
      return jsonError(500, "INTERNAL_ERROR", "Something went wrong.");
    }
  }

  return jsonError(
    409,
    "SLUG_TAKEN",
    "Could not generate a unique slug. Try a different title or custom slug."
  );
}
