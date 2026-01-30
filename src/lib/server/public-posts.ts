import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export type PublicPostCard = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null };
};

export type PublicPostDetail = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null };
};

// public feed (published posts only)
export const getPublicPosts = unstable_cache(
  async (): Promise<PublicPostCard[]> => {
    return prisma.post.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [{ publishedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
      },
    });
  },
  ["public-posts"],
  {
    // cache for 1 minute
    revalidate: 60,
    tags: ["public-posts"],
  },
);

// public post detail by slug -- ** published only **
export function getPublicPostBySlug(slug: string) {
  return unstable_cache(
    async (): Promise<PublicPostDetail | null> => {
      return prisma.post.findFirst({
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
    },
    ["public-post", slug],
    {
      revalidate: 60,
      tags: ["public-posts", `public-post:${slug}`],
    },
  )();
}
