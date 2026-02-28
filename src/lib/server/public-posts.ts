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
  publishedAt: Date | null;
  updatedAt: Date;
  author: PublicPostAuthor;
  readingTimeMin: number;
  tags: string[];
  viewCount: number; // ✅ add views to cards
};

export type PublicPostDetail = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  publishedAt: Date | null;
  updatedAt: Date;
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
        readingTimeMin: estimateReadingTimeMinutes(contentMd),
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
      readingTimeMin: estimateReadingTimeMinutes(contentMd),
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
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
        readingTimeMin: estimateReadingTimeMinutes(post.contentMd),
      };
    },
    ["public-post", slug],
    {
      revalidate: 60,
      tags: ["public-posts", `public-post:${slug}`],
    },
  )();
}
