import type { Metadata } from "next";
import { getPublicPosts } from "@/lib/server/public-posts";
import PublicPostsFeed from "./public-posts-feed";

export const metadata: Metadata = {
  title: "Posts",
  alternates: { canonical: "/posts" },
};

export default async function PublicPostsPage() {
  const posts = await getPublicPosts();
  const nextCursor = posts.length ? posts[posts.length - 1]!.id : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Posts</h1>
          <p className="mt-1 text-sm text-white/50">
            Published writing from the community.
          </p>
        </div>
      </div>

      <PublicPostsFeed initialPosts={posts} initialCursor={nextCursor} />
    </main>
  );
}
