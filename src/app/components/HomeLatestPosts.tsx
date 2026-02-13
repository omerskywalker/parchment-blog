"use client";

import Link from "next/link";
import { TagChips } from "@app/components/TagChips";
import type { PublicPostCard } from "@/lib/server/public-posts";

export default function HomeLatestPosts({ posts }: { posts: PublicPostCard[] }) {
  return (
    <div className="space-y-3">
      {posts.map((p, i) => (
        <Link
          key={p.id}
          href={`/posts/${p.slug}`}
          style={{
            opacity: 0,
            transform: "translateY(6px)",
            animation: "pb-fade-in 420ms ease-out forwards",
            animationDelay: `${i * 70}ms`,
          }}
          className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:bg-black/50 hover:border-white"
        >
          <h3 className="text-base font-medium text-white">{p.title}</h3>
          <p className="mt-1 text-sm text-white/50">{p.author?.name ?? "Anonymous"}</p>
          <TagChips tags={p.tags} variant="feed" className="mt-2" />
        </Link>
      ))}

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
