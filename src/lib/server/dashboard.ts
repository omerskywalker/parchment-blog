import { prisma } from "@/lib/db";

export async function getDashboardSummary(userId: string) {
  const [postCount, aggregates, recentPosts] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.post.aggregate({
      where: { authorId: userId },
      _sum: { viewCount: true, fireCount: true },
    }),
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        viewCount: true,
        fireCount: true,
      },
    }),
  ]);

  return {
    postCount,
    views: aggregates._sum.viewCount ?? 0,
    fires: aggregates._sum.fireCount ?? 0,
    recentPosts,
  };
}
