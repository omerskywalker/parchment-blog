"use client";

import Image from "next/image";
import Link from "next/link";
import type { PublicPostCard } from "@/lib/server/public-posts";
import { TagChips } from "@app/components/TagChips";
import { s3PublicUrlFromKey } from "@/lib/s3";

type WithExcerpt = PublicPostCard & { excerpt?: string };

export default function HomeLatestPostsV3({ posts }: { posts: WithExcerpt[] }) {
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
              <h3 className="line-clamp-2 text-base font-medium text-white">{p.title}</h3>

              {p.excerpt ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
                  {p.excerpt}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
                <span className="inline-flex items-center gap-2 text-white/70">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-white/10 bg-white/5" />
                  )}
                  <span className="truncate">{authorName}</span>
                </span>

                {p.publishedAt && (
                  <>
                    <span className="text-white/20">·</span>
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(p.publishedAt))}
                    </span>
                  </>
                )}

                <span className="text-white/20">·</span>
                <span>{p.readingTimeMin ?? 1} min read</span>

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
