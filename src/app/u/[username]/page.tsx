export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isV3Enabled } from "@/lib/flags";
import AuthorProfileV3 from "@/v3/AuthorProfileV3";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await prisma.user.findFirst({
    where: { username },
    select: { name: true, username: true, bio: true },
  });
  if (!user) return {};
  const displayName = user.name ?? user.username ?? "User";
  return {
    title: `${displayName} (@${user.username}) — Parchment`,
    description: user.bio ?? `Read posts by ${displayName} on Parchment.`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findFirst({
    where: { username },
    select: {
      name: true,
      username: true,
      bio: true,
      avatarKey: true,
      posts: {
        where: { publishedAt: { not: null } },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          updatedAt: true,
          tags: true,
          viewCount: true,
          fireCount: true,
        },
      },
      _count: { select: { posts: true } },
    },
  });

  const stats = user
    ? await prisma.post.aggregate({
        where: { author: { username }, publishedAt: { not: null } },
        _count: { _all: true },
        _sum: { viewCount: true, fireCount: true },
      })
    : null;

  const totalPosts = stats?._count?._all ?? 0;
  const totalReads = stats?._sum?.viewCount ?? 0;
  const totalFires = stats?._sum?.fireCount ?? 0;

  if (!user) notFound();

  // ── v3 feature flag switch ──
  const v3 = await isV3Enabled();
  if (v3) {
    return (
      <AuthorProfileV3
        user={user}
        totalPosts={totalPosts}
        totalReads={totalReads}
        totalFires={totalFires}
      />
    );
  }

  const displayName = user.name ?? user.username ?? "User";
  const avatarUrl = user.avatarKey
    ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${user.avatarKey}`
    : null;

  return (
    <main className="mx-auto max-w-[845px] px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={`${displayName} avatar`} fill priority className="object-cover" />
            ) : (
              <span className="text-xl font-semibold text-white/40 select-none">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{displayName}</h1>
            <p className="mt-1 text-sm text-white/50">
              {user.username ? `@${user.username}` : null}
            </p>
            {user.bio ? <p className="mt-3 text-sm text-white/75">{user.bio}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                {totalPosts} posts
              </span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                {totalReads.toLocaleString()} reads
              </span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                {totalFires.toLocaleString()} 🔥
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-white/60">Posts</h2>
        <div className="ml-4 h-px flex-1 bg-white/10" />
      </div>

      <section className="mt-4 space-y-3">
        {user.posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
            <p className="text-base font-medium text-white/70">No published posts yet</p>
            <p className="mt-1 text-sm text-white/40">
              {displayName} hasn&apos;t published anything yet. Check back later.
            </p>
          </div>
        ) : (
          user.posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-white hover:bg-black/50"
            >
              <h2 className="text-lg font-medium text-white">{p.title}</h2>
              <p className="mt-1 text-sm text-white/50">
                {p.publishedAt
                  ? new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    }).format(new Date(p.publishedAt))
                  : "Unpublished"}
              </p>
              {p.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex items-center gap-3 text-xs text-white/35">
                <span>{p.viewCount.toLocaleString()} reads</span>
                {p.fireCount > 0 && <span>{p.fireCount} 🔥</span>}
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
