export const dynamic = "force-dynamic";

import Link from "next/link";
import { getPublicPosts } from "@/lib/server/public-posts";
import HomeLatestPosts from "./components/HomeLatestPosts";

export default async function HomePage() {
  const posts = await getPublicPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-white">Parchment</h1>
      <p className="mt-2 text-sm text-white/60">A clean space for independent thought.</p>

      {posts.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Latest posts</h2>
            <Link href="/posts" className="text-sm text-white/60 hover:text-white">
              View all →
            </Link>
          </div>

          <HomeLatestPosts posts={posts.slice(0, 3)} />
        </section>
      )}
    </main>
  );
}
