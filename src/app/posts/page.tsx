import Link from "next/link";
import { getPublicPosts } from "@/lib/server/public-posts";

export const dynamic = "force-static";
export const revalidate = 60;

export default async function PublicPostsPage() {
  const posts = await getPublicPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Posts</h1>
          <p className="mt-1 text-sm text-white/60">Published writing from the community.</p>
        </div>

        <Link
          href="/"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          Home
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">No published posts yet.</p>
            <p className="mt-1 text-sm text-white/60">
              Publish something from your dashboard to see it here.
            </p>
          </div>
        ) : (
          posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-colors hover:bg-black/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{p.title}</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {p.author?.name ?? "Anonymous"}
                    {" · "}
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "Unpublished"}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
                  Published
                </span>
              </div>

              <p className="mt-3 text-sm text-white/60">/posts/{p.slug}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
