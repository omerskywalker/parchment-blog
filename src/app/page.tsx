export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Link from "next/link";
import { getPublicPosts } from "@/lib/server/public-posts";
import HomeLatestPosts from "./components/HomeLatestPosts";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const posts = await getPublicPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* hero */}
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Parchment Blog
        </h1>

        <p className="text-sm text-white/60 sm:text-base">A clean space for independent thought.</p>

        {/* primary CTA */}
        <div className="pt-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard/posts/new"
              className="inline-flex items-center rounded-md border border-white/10 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90"
            >
              New post →
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center rounded-md border border-white/10 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90"
            >
              Start writing →
            </Link>
          )}
        </div>
      </section>

      {/* latest Posts */}
      {posts.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Latest posts</h2>
            <Link href="/posts" className="text-sm text-white/60 transition hover:text-white">
              View all →
            </Link>
          </div>

          <HomeLatestPosts posts={posts.slice(0, 3)} />
        </section>
      )}
    </main>
  );
}
