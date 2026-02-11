import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPostBySlug } from "@/lib/server/public-posts";

import Markdown from "@/app/components/Markdown";
import { TagChips } from "@app/components/TagChips";

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
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {post.title}
        </h1>

        <p className="mt-2 text-sm text-white/50">
          {post.author?.name ?? "Anonymous"}
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

        <TagChips tags={post.tags} variant="detail" />

        <div className="mt-8 prose prose-invert max-w-none">
          <Markdown content={post.contentMd} />
        </div>
      </article>
    </main>
  );
}
