import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { estimateReadingTimeMinutes } from "@/lib/server/reading-time";

export type PublicPostCard = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null };
  readingTimeMin: number;
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
};

// public feed (published posts only)
export const getPublicPosts = unstable_cache(
  async (): Promise<PublicPostCard[]> => {
    const rows = await prisma.post.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [{ publishedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        contentMd: true, // required to compute reading time
        author: { select: { name: true } },
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

// public post detail by slug -- ** published only **
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
