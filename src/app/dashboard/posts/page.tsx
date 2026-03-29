"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyPosts } from "@/lib/api/posts";
import { qk } from "@/lib/queryKeys";
import { PostListSkeleton } from "@/app/components/skeletons/PostListSkeleton";

export default function MyPostsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: qk.myPosts(),
    queryFn: fetchMyPosts,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard/"
          className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">My posts</h1>

        <Link
          href="/dashboard/posts/new"
          className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          + New post
        </Link>
      </div>

      <div className="mt-6">
        {isPending ? (
          <PostListSkeleton count={4} />
        ) : isError || !data ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">Something went wrong.</p>
            <p className="mt-1 text-sm text-white/50">Unable to load your posts. Try refreshing.</p>
          </div>
        ) : !data.ok ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">{data.message ?? "Unable to load your posts."}</p>
          </div>
        ) : data.posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
            <p className="text-base font-medium text-white/80">No posts yet</p>
            <p className="mt-1 text-sm text-white/50">Create your first draft to get started.</p>
            <Link
              href="/dashboard/posts/new"
              className="mt-4 inline-flex items-center rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
            >
              + New post
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.posts.map((post) => {
              return (
                <Link
                  key={post.id + post.publishedAt}
                  href={`/dashboard/posts/${post.id}/edit`}
                  className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:border-white hover:bg-black/50"
                >
                  <li key={post.id} className="">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-medium text-white">{post.title}</p>
                        <p className="mt-1 text-sm text-white/50">/posts/{post.slug}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            "shrink-0 rounded-full px-2.5 py-1 text-xs",
                            post.publishedAt
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-white/10 text-white/70",
                          ].join(" ")}
                        >
                          {post.publishedAt ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </li>
                </Link>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
