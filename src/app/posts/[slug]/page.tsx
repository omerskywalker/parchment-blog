// src/app/posts/[slug]/page.tsx
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPostBySlug } from "@/lib/server/public-posts";
import PostStatsBar from "@/app/components/post/PostStatsBar";
import Markdown from "@/app/components/Markdown";
import { TagChips } from "@app/components/TagChips";
import { PostShareActions } from "@app/components/post/PostShareActions";
import { RelatedPosts } from "@app/components/post/RelatedPosts";
import { s3PublicUrlFromKey } from "@/lib/s3";
import PostViewsInline from "@app/components/post/PostViewsInline";

type Props = {
  params: Promise<{ slug: string }>;
};

const PLATFORM_DESCRIPTION =
  "A minimalist blogging platform for independent writers. No algorithmic feeds. Just your words.";

/** Extracts a plain-text description from the first paragraph of markdown content. */
function extractDescription(markdown: string): string {
  // Split into blocks separated by blank lines
  const blocks = markdown.split(/\n\s*\n/);

  for (const block of blocks) {
    const stripped = block
      .trim()
      // Remove headings
      .replace(/^#{1,6}\s+/gm, "")
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // Remove links — keep display text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Remove bold/italic/strikethrough
      .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, "$2")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove blockquote markers
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim();

    if (stripped.length > 20) {
      return stripped.length > 155 ? stripped.slice(0, 152) + "..." : stripped;
    }
  }

  return PLATFORM_DESCRIPTION;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const ogUrl = `/posts/${post.slug}/opengraph-image`;
  const description = extractDescription(post.contentMd);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/posts/${post.slug}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function PublicPostDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-[845px] px-4 py-10">
      {/* top nav row (outside card) */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <article className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
        {/* title + actions cluster (desktop) */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {post.title}
          </h1>

          {/* Desktop cluster: Fire + Copy + Share */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <PostStatsBar
              slug={post.slug}
              initialViewCount={post.viewCount ?? 0}
              initialFireCount={post.fireCount ?? 0}
              showViews={false}
              size="md"
              stretch={false}
            />
            <PostShareActions title={post.title} size="md" />
          </div>
        </div>

        {/* metadata line + inline views */}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50 sm:text-sm">
          {post.author?.username ? (
            <Link
              href={`/u/${post.author.username}`}
              className="group inline-flex items-center gap-2 font-medium text-white/80 transition-colors hover:text-white"
            >
              {post.author.avatarKey ? (
                <Image
                  src={s3PublicUrlFromKey(post.author.avatarKey) ?? ""}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-white/10 object-cover"
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

          <span>{post.readingTimeMin ?? 1} min read</span>

          <span className="text-white/20">·</span>

          <PostViewsInline slug={post.slug} initialViewCount={post.viewCount ?? 0} />
        </p>

        {/* tags + mobile actions */}
        <div className="mt-4 flex flex-col gap-3">
          <TagChips tags={post.tags ?? []} variant="detail" />

          {/* Mobile: Fire reaction + share row */}
          <div className="flex flex-col gap-2 sm:hidden">
            <PostStatsBar
              slug={post.slug}
              initialViewCount={post.viewCount ?? 0}
              initialFireCount={post.fireCount ?? 0}
              showViews={false}
              size="sm"
              stretch
              className="w-full"
            />
            <PostShareActions title={post.title} size="sm" layout="grid" className="w-full" />
          </div>
        </div>

        {/* divider before content */}
        <div className="mt-6 border-t border-white/5 pt-6">
          <div className="prose prose-invert max-w-none leading-relaxed">
            <Markdown content={post.contentMd} />
          </div>
        </div>
      </article>

      <RelatedPosts currentSlug={post.slug} tags={post.tags ?? []} />
    </main>
  );
}
