import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { estimateReadingTimeMinutes } from "@/lib/server/reading-time";

/* ============================================================
   Types
============================================================ */

export type PublicPostCard = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null };
  readingTimeMin: number;
  tags: string[];
};

export type PublicPostDetail = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null };
  readingTimeMin: number;
  tags: string[];
};

export type PublicPostCursorPage = {
  posts: PublicPostCard[];
  nextCursor: string | null;
};

/* ============================================================
   Cached public feed (first page only)
   - used by /posts for fast SSR
============================================================ */

export const getPublicPosts = unstable_cache(
  async (): Promise<PublicPostCard[]> => {
    const rows = await prisma.post.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [
        { publishedAt: "desc" },
        { id: "desc" },
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        contentMd: true,
        author: { select: { name: true } },
        tags: true,
      },
    });

    return rows.map(({ contentMd, ...p }) => ({
      ...p,
      readingTimeMin: estimateReadingTimeMinutes(contentMd),
    }));
  },
  ["public-posts"],
  {
    revalidate: 60,
    tags: ["public-posts"],
  },
);

/* ============================================================
   Cursor-based pagination (used by /api/public-posts)
   - NOT cached (or can be lightly cached later)
============================================================ */

export async function getPublicPostsPage(args: {
  cursor?: string | null;
  take?: number;
}): Promise<PublicPostCursorPage> {
  const take = Math.min(Math.max(args.take ?? 10, 1), 50);

  const rows = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [
      { publishedAt: "desc" },
      { id: "desc" },
    ],
    take: take + 1, // over-fetch to detect next page
    ...(args.cursor
      ? {
          cursor: { id: args.cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      contentMd: true,
      author: { select: { name: true } },
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
   Public post detail by slug (published only)
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
          author: { select: { name: true } },
          tags: true,
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
