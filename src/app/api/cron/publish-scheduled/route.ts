import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/publish-scheduled
 *
 * Called by Vercel Cron every 5 minutes.
 * Publishes any posts whose scheduledAt has passed and are still unpublished.
 *
 * Protected by CRON_SECRET — Vercel injects an Authorization: Bearer <secret>
 * header automatically when the route is configured in vercel.json.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");

  // In production, enforce the Vercel cron secret.
  // In CI (no CRON_SECRET), allow the request so the build/test pipeline works.
  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all posts due for publishing
  const due = await prisma.post.findMany({
    where: {
      scheduledAt: { lte: now },
      publishedAt: null,
    },
    select: { id: true, slug: true, scheduledAt: true },
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, published: 0 });
  }

  // Publish each in a transaction
  await prisma.$transaction(
    due.map((post) =>
      prisma.post.update({
        where: { id: post.id },
        data: {
          publishedAt: post.scheduledAt, // use scheduled time as publishedAt
          scheduledAt: null,            // clear schedule once published
        },
      }),
    ),
  );

  // Revalidate public feed and each post's cache tag
  revalidateTag("public-posts", "default");
  for (const post of due) {
    revalidateTag(`public-post:${post.slug}`, "default");
  }

  return NextResponse.json({ ok: true, published: due.length });
}
