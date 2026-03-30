"use client";

import * as React from "react";
import Link from "next/link";
import { TagChips } from "@app/components/TagChips";

type SearchPost = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  readingTimeMin: number;
  viewCount: number;
  tags: string[];
  authorName: string | null;
  authorUsername: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; posts: SearchPost[] }
  | { status: "error"; message: string };

export default function SearchFeed({ query }: { query: string }) {
  const [state, setState] = React.useState<State>({ status: "idle" });
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!query.trim()) {
      setState({ status: "idle" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading" });

    const params = new URLSearchParams({ q: query });
    fetch(`/api/posts/search?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setState({ status: "done", posts: data.posts });
        } else {
          setState({ status: "error", message: data.message ?? data.error ?? "Search failed." });
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setState({ status: "error", message: "Search failed." });
        }
      });

    return () => controller.abort();
  }, [query]);

  if (!query.trim()) return null;

  if (state.status === "loading") {
    return (
      <div className="mt-8 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-black/40 p-5">
            <div className="h-5 w-3/4 rounded bg-white/8" />
            <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
        <p className="text-white/70">{state.message}</p>
      </div>
    );
  }

  if (state.status === "done") {
    if (state.posts.length === 0) {
      return (
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
          <p className="text-base font-medium text-white/70">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-sm text-white/40">Try different keywords.</p>
        </div>
      );
    }

    return (
      <div className="mt-8 space-y-3">
        {state.posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}`}
            className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:-translate-y-0.5 hover:border-white hover:bg-black/50"
          >
            <h2 className="truncate text-lg font-medium text-white">{post.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
              {post.authorName || post.authorUsername ? (
                <span className="text-white/70">
                  {post.authorName ?? post.authorUsername}
                </span>
              ) : null}
              <span className="text-white/20">·</span>
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                }).format(new Date(post.publishedAt))}
              </span>
              <span className="text-white/20">·</span>
              <span>{post.readingTimeMin} min read</span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="opacity-70">👁</span>
                <span className="tabular-nums">{post.viewCount}</span>
              </span>
            </div>
            <TagChips tags={post.tags} variant="feed" className="mt-2" />
          </Link>
        ))}
        <p className="pt-2 text-center text-sm text-white/40">
          {state.posts.length} result{state.posts.length !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return null;
}
