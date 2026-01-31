"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyPosts } from "@/lib/api/posts";
import { qk } from "@/lib/queryKeys";

export default function MyPostsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: qk.myPosts(),
    queryFn: fetchMyPosts,
    retry: false,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to dashboard
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-white">My posts</h1>

        <Link
          href="/dashboard/posts/new"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          New post
        </Link>
      </div>

      <div className="mt-6">
        {isPending ? (
          <p className="text-white/70">Loading…</p>
        ) : isError || !data ? (
          <p className="text-white/70">Something went wrong.</p>
        ) : !data.ok ? (
          <p className="text-white/70">{data.message ?? "Unable to load your posts."}</p>
        ) : data.posts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">No posts yet.</p>
            <p className="mt-1 text-sm text-white/50">Create your first draft to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.posts.map((p) => {
              return (
                <li key={p.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* left: title + slug */}
                    <div>
                      <p className="text-base font-medium text-white">{p.title}</p>
                      <p className="mt-1 text-sm text-white/50">/posts/{p.slug}</p>
                    </div>

                    {/* right: status + actions */}
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "shrink-0 rounded-full px-2.5 py-1 text-xs",
                          p.publishedAt
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-white/10 text-white/70",
                        ].join(" ")}
                      >
                        {p.publishedAt ? "Published" : "Draft"}
                      </span>

                      <Link
                        href={`/dashboard/posts/${p.id}/edit`}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
