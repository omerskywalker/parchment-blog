import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { estimateReadingTimeMinutes } from "@/lib/server/reading-time";

/* ============================================================
   types
============================================================ */

export type PublicPostAuthor = {
  name: string | null;
  username: string | null;
  avatarKey: string | null;
};

export type PublicPostCard = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  updatedAt: string;
  author: { name: string | null; username: string | null; avatarKey: string | null };
  readingTimeMin: number;
  tags: string[];
  viewCount: number;
};

export type PublicPostDetail = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  publishedAt: string | null;
  updatedAt: string;
  author: PublicPostAuthor;
  readingTimeMin: number;
  tags: string[];
  viewCount: number;
  fireCount: number;
};

export type PublicPostCursorPage = {
  posts: PublicPostCard[];
  nextCursor: string | null;
};

/* ============================================================
cached public feed (first page only)
- used by /posts for fast SSR
- optionally filtered by tag
============================================================ */

export function getPublicPosts(args?: { tag?: string | null }) {
  const tag = args?.tag?.trim() || null;

  return unstable_cache(
    async (): Promise<PublicPostCard[]> => {
      const rows = await prisma.post.findMany({
        where: {
          publishedAt: { not: null },
          ...(tag ? { tags: { has: tag } } : {}),
        },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          updatedAt: true,
          contentMd: true,
          viewCount: true, // ✅
          author: { select: { name: true, username: true, avatarKey: true } },
          tags: true,
        },
      });

      return rows.map(({ contentMd, ...p }) => ({
        ...p,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
        updatedAt: p.updatedAt.toISOString(),
        readingTimeMin: estimateReadingTimeMinutes(contentMd),
        viewCount: p.viewCount ?? 0,
      }));
    },
    ["public-posts", tag ?? "all"],
    {
      revalidate: 60,
      tags: ["public-posts"],
    },
  )();
}

/* ============================================================
   cursor-based pagination (used by /api/public-posts)
   - NOT cached (or can be lightly cached later)
============================================================ */

export async function getPublicPostsPage(args: {
  cursor?: string | null;
  take?: number;
  tag?: string;
}): Promise<PublicPostCursorPage> {
  const take = Math.min(Math.max(args.take ?? 10, 1), 50);

  const rows = await prisma.post.findMany({
    where: {
      publishedAt: { not: null },
      ...(args.tag ? { tags: { has: args.tag } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      contentMd: true,
      viewCount: true, // ✅
      author: { select: { name: true, username: true, avatarKey: true } },
      tags: true,
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    posts: page.map(({ contentMd, ...p }) => ({
      ...p,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      updatedAt: p.updatedAt.toISOString(),
      readingTimeMin: estimateReadingTimeMinutes(contentMd),
      viewCount: p.viewCount ?? 0,
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

/* ============================================================
   related posts by tag overlap (up to `limit`, excludes current post)
============================================================ */

export async function getRelatedPosts(
  currentSlug: string,
  tags: string[],
  limit = 3,
): Promise<PublicPostCard[]> {
  if (!tags.length) return [];

  const rows = await prisma.post.findMany({
    where: {
      publishedAt: { not: null },
      slug: { not: currentSlug },
      tags: { hasSome: tags },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit * 4, // fetch extra so we can re-sort by overlap count in JS
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      contentMd: true,
      viewCount: true,
      author: { select: { name: true, username: true, avatarKey: true } },
      tags: true,
    },
  });

  const withScore = rows.map(({ contentMd, ...p }) => ({
    post: {
      ...p,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      updatedAt: p.updatedAt.toISOString(),
      readingTimeMin: estimateReadingTimeMinutes(contentMd),
      viewCount: p.viewCount ?? 0,
    },
    score: p.tags.filter((t) => tags.includes(t)).length,
  }));

  withScore.sort((a, b) => b.score - a.score);

  return withScore.slice(0, limit).map((x) => x.post);
}

/* ============================================================
   adjacent posts for prev/next navigation
   - queries by createdAt, same-author first then global fallback
============================================================ */

export type AdjacentPost = { title: string; slug: string };
export type AdjacentPosts = { prev: AdjacentPost | null; next: AdjacentPost | null };

const adjacentSelect = { title: true, slug: true } as const;

async function queryAdjacent(
  createdAt: Date,
  direction: "prev" | "next",
  authorId: string,
): Promise<AdjacentPost | null> {
  const filter = direction === "prev" ? { lt: createdAt } : { gt: createdAt };
  const order = direction === "prev" ? ("desc" as const) : ("asc" as const);

  // 1) Try same-author first
  const sameAuthor = await prisma.post.findFirst({
    where: { publishedAt: { not: null }, authorId, createdAt: filter },
    orderBy: { createdAt: order },
    select: adjacentSelect,
  });
  if (sameAuthor) return sameAuthor;

  // 2) Global fallback
  return prisma.post.findFirst({
    where: { publishedAt: { not: null }, NOT: { authorId }, createdAt: filter },
    orderBy: { createdAt: order },
    select: adjacentSelect,
  });
}

export async function getAdjacentPosts(slug: string): Promise<AdjacentPosts> {
  const current = await prisma.post.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: { createdAt: true, authorId: true },
  });

  if (!current) return { prev: null, next: null };

  const [prev, next] = await Promise.all([
    queryAdjacent(current.createdAt, "prev", current.authorId),
    queryAdjacent(current.createdAt, "next", current.authorId),
  ]);

  return { prev, next };
}

/* ============================================================
   public post detail by slug (published only)
============================================================ */

export function getPublicPostBySlug(slug: string) {
  return unstable_cache(
    async (): Promise<PublicPostDetail | null> => {
      const post = await prisma.post.findFirst({
        where: { slug, publishedAt: { not: null } },
        select: {
          id: true,
          title: true,
          slug: true,
          contentMd: true,
          publishedAt: true,
          updatedAt: true,
          author: { select: { name: true, username: true, avatarKey: true } },
          tags: true,
          viewCount: true,
          fireCount: true,
        },
      });

      if (!post) return null;

      return {
        ...post,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        updatedAt: post.updatedAt.toISOString(),
        readingTimeMin: estimateReadingTimeMinutes(post.contentMd),
        viewCount: post.viewCount ?? 0,
        fireCount: post.fireCount ?? 0,
      };
    },
    ["public-post", slug],
    {
      revalidate: 60,
      tags: ["public-posts", `public-post:${slug}`],
    },
  )();
}
