import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPostBySlug } from "@/lib/server/public-posts";

import Markdown from "@/app/components/Markdown";

export const dynamic = "force-static";
export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>; // matches your Next “params are async” setup
};

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

        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
          Published
        </span>
      </div>

      <article className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{post.title}</h1>

        <p className="mt-2 text-sm text-white/60">
          {post.author?.name ?? "Anonymous"}
          {" · "}
          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Unpublished"}
          {" · "}
          <span className="text-white/50">/posts/{post.slug}</span>
        </p>

        <div className="mt-8">
          <Markdown content={post.contentMd} />
        </div>
      </article>
    </main>
  );
}
