"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PublicPostCard } from "../../lib/server/public-posts";
import { TagChips } from "../components/TagChips";

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

type ApiPage =
  | { ok: true; posts: ApiPost[]; nextCursor: string | null }
  | { ok: false; error: string; message?: string };

async function fetchPublicPage(args: { cursor: string | null; tag?: string }) {
  const params = new URLSearchParams();
  if (args.cursor) params.set("cursor", args.cursor);
  params.set("take", "10");
  if (args.tag) params.set("tag", args.tag);

  const res = await fetch(`/api/public-posts?${params.toString()}`);

  const data = (await res.json()) as ApiPage;

  if (!res.ok || !data.ok) {
    const message = data.ok ? "Request failed." : data.message ?? data.error;
    throw new Error(message);
  }

  return data;
}

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

  const q = useInfiniteQuery({
    queryKey: ["public-posts-cursor", scope, { take: 10, tag: normalizedTag ?? null }],
    queryFn: ({ pageParam }) =>
      fetchPublicPage({ cursor: (pageParam ?? null) as string | null, tag: normalizedTag }),
    initialPageParam: initialCursor, // first fetch grabs page after SSR
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: {
      pages: [
        {
          ok: true as const,
          posts: initialPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
            updatedAt: new Date(p.updatedAt).toISOString(),
            author: p.author,
            readingTimeMin: p.readingTimeMin,
            tags: p.tags
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

  const posts = q.data.pages.flatMap((p) => p.posts);
  const last = q.data.pages[q.data.pages.length - 1];
  const hasMore = last.nextCursor !== null;

  return (
    <div className="mt-8 space-y-3">
      {q.isError ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-white/80">Unable to load posts.</p>
          <p className="mt-1 text-sm text-white/50">{(q.error as Error).message}</p>
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
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:bg-black/50 hover:-translate-y-0.5 hover:border-white"
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
                </div>

              </div>
              <TagChips tags={post.tags} variant="feed" className="mt-2" />

              

              {/* <p className="mt-3 text-sm text-white/50">/posts/{post.slug}</p> */}
            </Link>
          ))}

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
              <p className="text-sm text-white/50">You’re all caught up.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
