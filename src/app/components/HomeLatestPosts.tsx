"use client";

import Link from "next/link";
import type { PublicPostCard } from "@/lib/server/public-posts";
import { TagChips } from "@app/components/TagChips";
import { s3PublicUrlFromKey } from "@/lib/s3";

export default function HomeLatestPosts({ posts }: { posts: PublicPostCard[] }) {
  return (
    <div className="space-y-3">
      {posts.map((p, i) => {
        const authorName = p.author?.name ?? "Anonymous";
        const avatarUrl = p.author?.avatarKey ? s3PublicUrlFromKey(p.author.avatarKey) : null;
        const views = p.viewCount ?? 0;

        return (
          <Link
            key={p.id}
            href={`/posts/${p.slug}`}
            style={{
              opacity: 0,
              transform: "translateY(6px)",
              animation: "pb-fade-in 420ms ease-out forwards",
              animationDelay: `${i * 70}ms`,
            }}
            className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/50"
          >
            <div className="min-w-0">
              <h3 className="truncate text-base font-medium text-white">{p.title}</h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
                <span className="inline-flex items-center gap-2 text-white/70">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl ?? undefined}
                      alt=""
                      className="h-5 w-5 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-white/10 bg-white/5" />
                  )}
                  <span className="truncate">{authorName}</span>
                </span>

                <span className="text-white/20">·</span>

                <span className="inline-flex items-center gap-1">
                  <span className="opacity-70">👁</span>
                  <span className="tabular-nums">{views}</span>
                </span>
              </div>

              <TagChips tags={p.tags} variant="feed" className="mt-2" />
            </div>
          </Link>
        );
      })}

      {/* local keyframes so you don't need to touch global css */}
      <style jsx>{`
        @keyframes pb-fade-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          a {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
