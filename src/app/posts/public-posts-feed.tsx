"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
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

type PageParam = string | null;

type ApiPage = { ok: true; posts: ApiPost[]; nextCursor: string | null };
type ApiError = { ok: false; error: string; message?: string };

async function fetchPublicPage(args: { cursor: string | null; tag?: string }) {
  const params = new URLSearchParams();
  if (args.cursor) params.set("cursor", args.cursor);
  params.set("take", "10");
  if (args.tag) params.set("tag", args.tag);

  const res = await fetch(`/api/public-posts?${params.toString()}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as ApiPage | ApiError;

  if (!res.ok || !data.ok) {
    const message = data.ok ? "Request failed." : data.message ?? data.error;
    throw new Error(message);
  }

  return data; // ApiPage
}

/**
 * Track which IDs have been seen so we only animate newly appended cards.
 * We’ll “seed” it with initial IDs when we decide initial page should NOT animate.
 */
function useSeenIds() {
  const seenRef = React.useRef<Set<string>>(new Set());
  const [justAdded, setJustAdded] = React.useState<Set<string>>(new Set());

  const markSeen = React.useCallback((ids: string[]) => {
    for (const id of ids) seenRef.current.add(id);
  }, []);

  const computeJustAdded = React.useCallback((ids: string[]) => {
    const nextJustAdded = new Set<string>();

    for (const id of ids) {
      if (!seenRef.current.has(id)) {
        nextJustAdded.add(id);
        seenRef.current.add(id);
      }
    }

    if (nextJustAdded.size > 0) setJustAdded(nextJustAdded);
  }, []);

  return { justAdded, markSeen, computeJustAdded };
}

/**
 * FLIP animation: smoothly animates layout shifts when list changes.
 * - Records previous rects
 * - After DOM updates, animates from old position to new
 */
function useFlipList(ids: string[]) {
  const nodeByIdRef = React.useRef(new Map<string, HTMLElement>());
  const prevRectsRef = React.useRef(new Map<string, DOMRect>());

  const register = React.useCallback((id: string) => {
    return (node: HTMLElement | null) => {
      if (node) nodeByIdRef.current.set(id, node);
      else nodeByIdRef.current.delete(id);
    };
  }, []);

  // Capture "before" positions
  React.useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    for (const id of ids) {
      const node = nodeByIdRef.current.get(id);
      if (node) next.set(id, node.getBoundingClientRect());
    }
    prevRectsRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  // Animate "after" positions (next paint)
  React.useLayoutEffect(() => {
    const prev = prevRectsRef.current;

    for (const id of ids) {
      const node = nodeByIdRef.current.get(id);
      const prevRect = prev.get(id);
      if (!node || !prevRect) continue;

      const nextRect = node.getBoundingClientRect();
      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;

      if (dx === 0 && dy === 0) continue;

      // Invert
      node.style.transform = `translate(${dx}px, ${dy}px)`;
      node.style.transition = "transform 0s";

      // Play
      requestAnimationFrame(() => {
        node.style.transition = "transform 220ms ease-out";
        node.style.transform = "translate(0, 0)";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return { register };
}

/**
 * Detect whether the app initially loaded on /posts (hard load / direct visit)
 * - On first client render anywhere in the app, we store __pb_initial_path
 * - If that initial path starts with /posts, we allow initial animation
 * - If the initial path is / (or anything else), and user later navigates to /posts,
 *   we do NOT animate the initial page cards.
 */
function useDirectVisitToPosts() {
  const [direct, setDirect] = React.useState(false);

  React.useEffect(() => {
    const w = window as any;
    if (!w.__pb_initial_path) {
      w.__pb_initial_path = window.location.pathname + window.location.search;
    }
    const initialPath: string = w.__pb_initial_path;
    setDirect(initialPath.startsWith("/posts"));
  }, []);

  return direct;
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

  const q = useInfiniteQuery<
    ApiPage,
    Error,
    InfiniteData<ApiPage, PageParam>,
    (string | { take: number; tag: string | null } | "home" | "posts")[],
    PageParam
  >({
    queryKey: ["public-posts-cursor", scope, { take: 10, tag: normalizedTag ?? null }],
    queryFn: ({ pageParam }) => fetchPublicPage({ cursor: pageParam ?? null, tag: normalizedTag }),

    // must match initialData.pageParams shape
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
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
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

  // 1) only animate initial page if direct-visit to /posts
  const directVisitToPosts = useDirectVisitToPosts();

  // seen-id logic
  const { justAdded, markSeen, computeJustAdded } = useSeenIds();

  // Seed “seen” if we do NOT want initial animation
  React.useEffect(() => {
    if (!directVisitToPosts) {
      markSeen(posts.map((p) => p.id));
    } else {
      // If direct visit, we want first render to animate (so do NOT mark as seen yet)
      computeJustAdded(posts.map((p) => p.id));
    }
    // run once after we know directVisitToPosts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directVisitToPosts]);

  // Any time posts list changes after initial seed, animate only the new ones
  React.useEffect(() => {
    // If directVisitToPosts is false, initial posts were seeded as seen; this will only animate appended pages.
    // If directVisitToPosts is true, this will animate first page once (and later appended pages too).
    computeJustAdded(posts.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.map((p) => p.id).join("|")]);

  // 2) FLIP layout animation for smooth settling when list grows
  const { register } = useFlipList(posts.map((p) => p.id));

  const lastPage = q.data?.pages[q.data.pages.length - 1];
  const hasMore = lastPage ? lastPage.nextCursor !== null : false;

  return (
    <div className="mt-8 space-y-3">
      {q.isError ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-white/80">Unable to load posts.</p>
          <p className="mt-1 text-sm text-white/50">{q.error.message}</p>
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
                ref={register(post.id) as any}
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
              <p className="text-sm text-white/50">You’re all caught up.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
