export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPostBySlug } from "@/lib/server/public-posts";
import PostStatsBar from "@/app/components/PostStatsBar";
import Markdown from "@/app/components/Markdown";
import { TagChips } from "@app/components/TagChips";
import { s3PublicUrlFromKey } from "@/lib/s3";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);

  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    alternates: { canonical: `/posts/${post.slug}` },
    // later: description, openGraph, twitter
  };
}

export default async function PublicPostDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <article className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{post.title}</h1>

        <p className="mt-2 text-sm text-white/50">
          {post.author?.username ? (
            <Link
              href={`/u/${post.author.username}`}
              className="group inline-flex items-center gap-2 font-medium text-white/80 transition-colors hover:text-white"
            >
              {/* Avatar thumb */}
              {post.author.avatarKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s3PublicUrlFromKey(post.author.avatarKey) ?? undefined}
                  alt=""
                  className="h-5 w-5 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <span className="h-5 w-5 rounded-full border border-white/10 bg-white/5" />
              )}

              {/* Name + micro arrow */}
              <span className="underline-offset-4 group-hover:underline">
                {post.author.name ?? post.author.username}
              </span>
              <span className="text-white/30 transition group-hover:text-white/50">→</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-white/70">
              <span className="h-5 w-5 rounded-full border border-white/10 bg-white/5" />
              {post.author?.name ?? "Anonymous"}
            </span>
          )}
          {" · "}
          {post.publishedAt
            ? new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              }).format(new Date(post.publishedAt))
            : "Unpublished"}
          {" · "}
          {post.readingTimeMin} min read
        </p>

        <PostStatsBar
          slug={post.slug}
          initialViewCount={post.viewCount}
          initialFireCount={post.fireCount}
        />

        <TagChips tags={post.tags} variant="detail" />

        <div className="prose prose-invert mt-8 max-w-none">
          <Markdown content={post.contentMd} />
        </div>
      </article>
    </main>
  );
}
