"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyPosts } from "@/lib/api/posts";
import { qk } from "@/lib/queryKeys";
import { PostListSkeleton } from "@/app/components/skeletons/PostListSkeleton";
import { sortMyPosts, type PostSortKey } from "@/lib/sortMyPosts";

const SORT_LABELS: Record<PostSortKey, string> = {
  date: "Recent",
  views: "Most views",
  fires: "Most fires",
};

export default function MyPostsPage() {
  const [sortBy, setSortBy] = React.useState<PostSortKey>("date");

  const { data, isPending, isError } = useQuery({
    queryKey: qk.myPosts(),
    queryFn: fetchMyPosts,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const sortedPosts = React.useMemo(() => {
    if (!data?.ok) return [];
    return sortMyPosts(data.posts, sortBy);
  }, [data, sortBy]);

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
          <>
            {/* sort controls */}
            <div className="mb-3 flex items-center gap-1.5">
              <span className="mr-1 text-xs text-white/40">Sort:</span>
              {(Object.keys(SORT_LABELS) as PostSortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={[
                    "rounded-md px-2.5 py-1 text-xs transition-colors",
                    sortBy === key
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:text-white/70",
                  ].join(" ")}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>

            <ul className="space-y-3">
              {sortedPosts.map((post) => (
                <li key={post.id + post.publishedAt}>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-5 transition-colors hover:border-white/20">
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        href={`/dashboard/posts/${post.id}/edit`}
                        className="min-w-0 flex-1 group"
                      >
                        <p className="truncate text-base font-medium text-white group-hover:text-white/90">
                          {post.title}
                        </p>
                        <p className="mt-1 text-sm text-white/50">/posts/{post.slug}</p>
                      </Link>

                      <div className="flex shrink-0 items-center gap-3">
                        {/* stats */}
                        <span className="flex items-center gap-2.5 text-xs text-white/40">
                          <span className="inline-flex items-center gap-1">
                            <span>👁</span>
                            <span className="tabular-nums">{post.viewCount}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span>🔥</span>
                            <span className="tabular-nums">{post.fireCount}</span>
                          </span>
                        </span>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs",
                            post.publishedAt
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-white/10 text-white/70",
                          ].join(" ")}
                        >
                          {post.publishedAt ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/posts/${post.id}/edit`}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                      >
                        Edit
                      </Link>
                      {post.publishedAt && (
                        <>
                          <Link
                            href={`/posts/${post.slug}`}
                            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                          >
                            View
                          </Link>
                          <a
                            href={`/api/posts/${post.slug}/markdown`}
                            download={`${post.slug}.md`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                            aria-label={`Download ${post.title} as Markdown`}
                            title="Download as Markdown"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 16 16"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M8 2.5v8" />
                              <path d="M4.5 7 8 10.5 11.5 7" />
                              <path d="M3 13h10" />
                            </svg>
                            <span>.md</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
