export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPostBySlug } from "@/lib/server/public-posts";
import PostStatsBar from "@/app/components/post/PostStatsBar";
import Markdown from "@/app/components/Markdown";
import { TagChips } from "@app/components/TagChips";
import { PostShareActions } from "@app/components/post/PostShareActions";
import { s3PublicUrlFromKey } from "@/lib/s3";
import PostViewsInline from "@app/components/post/PostViewsInline";

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
  };
}

export default async function PublicPostDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* top nav row (outside card) */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <article className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        {/* title + share (desktop) */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{post.title}</h1>

          {/* desktop share buttons live here */}
          <div className="hidden shrink-0 sm:block">
            <PostShareActions title={post.title} />
          </div>
        </div>

        {/* metadata line + inline views */}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
          {post.author?.username ? (
            <Link
              href={`/u/${post.author.username}`}
              className="group inline-flex items-center gap-2 font-medium text-white/80 transition-colors hover:text-white"
            >
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

          <span className="text-white/20">·</span>

          <span>
            {post.publishedAt
              ? new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                }).format(new Date(post.publishedAt))
              : "Unpublished"}
          </span>

          <span className="text-white/20">·</span>

          <span>{post.readingTimeMin} min read</span>

          <span className="text-white/20">·</span>

          <PostViewsInline slug={post.slug} initialViewCount={post.viewCount} />
        </p>

        {/* tags left + actions right (tight header) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <TagChips tags={post.tags} variant="detail" />

          {/* actions */}
          <div className="flex items-center gap-2">
            {/* fire first on mobile (and desktop too, consistent) */}
            <PostStatsBar
              slug={post.slug}
              initialViewCount={post.viewCount}
              initialFireCount={post.fireCount}
              showViews={false}
              className="mt-0"
              size="sm"
            />

            {/* share buttons next on mobile only */}
            <div className="sm:hidden">
              <PostShareActions title={post.title} size="sm" />
            </div>
          </div>
        </div>

        <div className="prose prose-invert mt-8 max-w-none">
          <Markdown content={post.contentMd} />
        </div>
      </article>
    </main>
  );
}
