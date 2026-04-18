import Image from "next/image";
import Link from "next/link";
import type { PublicPostDetail } from "@/lib/server/public-posts";
import PostStatsBar from "@/app/components/post/PostStatsBar";
import Markdown from "@/app/components/Markdown";
import { TagChips } from "@app/components/TagChips";
import { PostShareActions } from "@app/components/post/PostShareActions";
import { RelatedPosts } from "@app/components/post/RelatedPosts";
import { PrevNextNav } from "@app/components/post/PrevNextNav";
import { s3PublicUrlFromKey } from "@/lib/s3";
import PostViewsInline from "@app/components/post/PostViewsInline";
import { ReadingProgressBar } from "@app/components/post/ReadingProgressBar";
import { TableOfContentsV3, extractHeadings } from "./components/TableOfContentsV3";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://parchment.blog";

interface Props {
  post: PublicPostDetail;
  description: string;
}

export default function PostDetailV3({ post, description }: Props) {
  const authorName = post.author?.name ?? post.author?.username ?? "Anonymous";
  const authorUrl = post.author?.username
    ? `${SITE_URL}/u/${post.author.username}`
    : undefined;
  const postUrl = `${SITE_URL}/posts/${post.slug}`;
  const headings = extractHeadings(post.contentMd);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    url: postUrl,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "Parchment",
      url: SITE_URL,
    },
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
    image: `${SITE_URL}/posts/${post.slug}/opengraph-image`,
    isPartOf: { "@type": "WebSite", name: "Parchment", url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ReadingProgressBar />

      <main className="mx-auto max-w-[845px] px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/posts"
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          >
            ← Back to posts
          </Link>
        </div>

        <div className="mt-6 flex items-start gap-10">
          <article className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {post.title}
              </h1>

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

            <div className="mt-4 flex flex-col gap-3">
              <TagChips tags={post.tags ?? []} variant="detail" />

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

            <div className="mt-6 border-t border-white/5 pt-6">
              <div className="prose prose-invert max-w-none leading-relaxed">
                <Markdown content={post.contentMd} />
              </div>
            </div>
          </article>

          <TableOfContentsV3 headings={headings} />
        </div>

        <PrevNextNav slug={post.slug} />
        <RelatedPosts currentSlug={post.slug} tags={post.tags ?? []} />
      </main>
    </>
  );
}
