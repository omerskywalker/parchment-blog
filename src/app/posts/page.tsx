export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { getPublicPostsPage } from "@/lib/server/public-posts";
import PublicPostsFeed from "./public-posts-feed";
import { unstable_noStore as noStore } from "next/cache";

export const metadata: Metadata = {
  title: "Posts",
  alternates: { canonical: "/posts" },
};

type Props = {
  searchParams: Promise<{ tag?: string | string[] }>;
};

export default async function PublicPostsPage({ searchParams }: Props) {
  noStore();
  const sp = await searchParams;

  const rawTag = Array.isArray(sp.tag) ? sp.tag[0] : sp.tag;
  const tag = rawTag?.trim().toLowerCase();

  // SSR fetch page 1 (10) + nextCursor
  const { posts: initialPosts, nextCursor: initialCursor } = await getPublicPostsPage({
    cursor: null,
    take: 10,
    tag,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Posts</h1>
          <p className="mt-1 text-sm text-white/50">Published writing from the community.</p>

          {tag ? (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-white/60">
                Filtering by <span className="text-white">#{tag}</span>
              </p>
              <Link href="/posts" className="text-xs text-white/50 hover:text-white">
                Clear filter
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* client infinite feed */}
      <PublicPostsFeed
        initialPosts={initialPosts}
        initialCursor={initialCursor}
        tag={tag}
        scope="posts"
      />
    </main>
  );
}
