"use client";

import * as React from "react";
import Link from "next/link";
import {
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import type { PublicPostCard } from "../../lib/server/public-posts";
import { TagChips } from "../components/TagChips";

/* ============================================================
   Types
============================================================ */

type ApiPost = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  updatedAt: string;
  author: { name: string | null };
  readingTimeMin: number;
  tags: string[];
};

type ApiPage = {
  ok: true;
  posts: ApiPost[];
  nextCursor: string | null;
};

type ApiError = {
  ok: false;
  error: string;
  message?: string;
};

type PageParam = string | null;

/* ============================================================
   Fetch
============================================================ */

async function fetchPublicPage(args: {
  cursor: PageParam;
  tag?: string;
}): Promise<ApiPage> {
  const params = new URLSearchParams();

  if (args.cursor) params.set("cursor", args.cursor);
  params.set("take", "10");
  if (args.tag) params.set("tag", args.tag);

  const res = await fetch(`/api/public-posts?${params.toString()}`);
  const data = (await res.json()) as ApiPage | ApiError;

  if (!res.ok || !data.ok) {
    const message = data.ok
      ? "Request failed."
      : data.message ?? data.error;
    throw new Error(message);
  }

  return data;
}

/* ============================================================
   Tracks which cards are newly added (for animation)
============================================================ */

function useSeenIds(ids: string[]) {
  const seenRef = React.useRef<Set<string>>(new Set());
  const [justAdded, setJustAdded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const nextJustAdded = new Set<string>();

    for (const id of ids) {
      if (!seenRef.current.has(id)) {
        nextJustAdded.add(id);
        seenRef.current.add(id);
      }
    }

    if (nextJustAdded.size > 0) {
      setJustAdded(nextJustAdded);
    }
  }, [ids.join("|")]);

  return justAdded;
}

/* ============================================================
   Component
============================================================ */

export default function PublicPostsFeed({
  initialPosts,
  initialCursor,
  tag,
  scope = "posts",
}: {
  initialPosts: PublicPostCard[];
  initialCursor: string | null;
  tag?: string;
  scope?: "home" | "posts";
}) {
  const normalizedTag = tag?.trim().toLowerCase() || undefined;

  const queryKey = [
    "public-posts-cursor",
    scope,
    { take: 10, tag: normalizedTag ?? null },
  ] as const;

  const q = useInfiniteQuery<
    ApiPage,                 // TQueryFnData
    Error,                   // TError
    InfiniteData<ApiPage>,   // TData
    typeof queryKey,         // TQueryKey
    PageParam                // TPageParam
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchPublicPage({
        cursor: pageParam,
        tag: normalizedTag,
      }),

    initialPageParam: null,

    getNextPageParam: (lastPage) => lastPage.nextCursor,

    initialData: {
      pages: [
        {
          ok: true as const,
          posts: initialPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            publishedAt: p.publishedAt
              ? new Date(p.publishedAt).toISOString()
              : null,
            updatedAt: new Date(p.updatedAt).toISOString(),
            author: p.author,
            readingTimeMin: p.readingTimeMin,
            tags: p.tags,
          })),
          nextCursor: initialCursor,
        },
      ],
      pageParams: [null],
    },

    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const posts = q.data?.pages.flatMap((p) => p.posts) ?? [];

  const justAdded = useSeenIds(posts.map((p) => p.id));

  const lastPage = q.data?.pages[q.data.pages.length - 1];
  const hasMore = lastPage ? lastPage.nextCursor !== null : false;

  /* ============================================================
     Render
  ============================================================ */

  return (
    <div className="mt-8 space-y-3">
      {q.isError ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-white/80">Unable to load posts.</p>
          <p className="mt-1 text-sm text-white/50">
            {q.error.message}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-white/80">No published posts yet.</p>
          <p className="mt-1 text-sm text-white/50">
            Publish something from your dashboard to see it here.
          </p>
        </div>
      ) : (
        <>
          {posts.map((post, i) => {
            const isNew = justAdded.has(post.id);

            return (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className={[
                  "block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:bg-black/50 hover:-translate-y-0.5 hover:border-white",
                  isNew ? "pb-fade-in" : "",
                ].join(" ")}
                style={
                  isNew
                    ? ({
                        ["--pb-delay" as any]: `${Math.min(i, 8) * 30}ms`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      {post.title}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">
                      {post.author?.name ?? "Anonymous"} ·{" "}
                      {post.publishedAt
                        ? new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          }).format(new Date(post.publishedAt))
                        : "Unpublished"}{" "}
                      · {post.readingTimeMin} min read
                    </p>
                  </div>
                </div>

                <TagChips
                  tags={post.tags}
                  variant="feed"
                  className="mt-2"
                />
              </Link>
            );
          })}

          <div className="flex justify-center pt-4">
            {hasMore ? (
              <button
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
                className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
              >
                {q.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <p className="text-sm text-white/50">
                You’re all caught up.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
