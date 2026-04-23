import { prisma } from "@/lib/db";

export async function getDashboardSummary(userId: string) {
  const [postCount, draftCount, aggregates, listens, recentPosts, latestDraft] =
    await Promise.all([
      prisma.post.count({
        where: { authorId: userId, publishedAt: { not: null } },
      }),
      prisma.post.count({
        where: { authorId: userId, publishedAt: null },
      }),
      prisma.post.aggregate({
        where: { authorId: userId },
        _sum: { viewCount: true, fireCount: true },
      }),
      // Listens live on PostAudio rather than Post — sum across this
      // author's audio rows. Filtering through the post relation keeps
      // it scoped without needing a denormalized authorId on PostAudio.
      prisma.postAudio.aggregate({
        where: { post: { authorId: userId } },
        _sum: { listenCount: true },
      }),
      // Published-or-draft, latest activity first — only published rows
      // are shown here; drafts have their own section/route.
      prisma.post.findMany({
        where: { authorId: userId, publishedAt: { not: null } },
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
      // Single most-recently-touched draft for the dashboard preview row.
      // The full list lives at /dashboard/drafts.
      prisma.post.findFirst({
        where: { authorId: userId, publishedAt: null },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          updatedAt: true,
        },
      }),
    ]);

  return {
    postCount,
    draftCount,
    views: aggregates._sum.viewCount ?? 0,
    fires: aggregates._sum.fireCount ?? 0,
    listens: listens._sum.listenCount ?? 0,
    recentPosts,
    latestDraft,
  };
}
