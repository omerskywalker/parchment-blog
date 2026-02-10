import Link from "next/link";
import type { Metadata } from "next";
import { getPublicPosts } from "@/lib/server/public-posts";
import { TagChips } from "../components/TagChips";

export const metadata: Metadata = {
  title: "Posts",
  alternates: { canonical: "/posts" },
};

export default async function PublicPostsPage() {
  const posts = await getPublicPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Posts</h1>
          <p className="mt-1 text-sm text-white/50">Published writing from the community.</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">No published posts yet.</p>
            <p className="mt-1 text-sm text-white/50">
              Publish something from your dashboard to see it here.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-4 transition-all hover:bg-black/50 hover:-translate-y-[2px] hover:border-white/60"

            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{post.title}</h2>
                  <p className="mt-1 text-sm text-white/50">
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

                  <TagChips tags={post.tags} variant="feed" className="mt-2" />
                </div>

                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
                  Published
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
