import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/server/dashboard";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}

function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?next=%2Fdashboard");

  const summary = await getDashboardSummary(session.user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {capitalizeEachWord(session.user.name)}&apos;s Dashboard
          </h1>
          <p className="mt-2 text-[rgb(var(--muted))]">Signed in as {session.user.email}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/posts/new"
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            + New post
          </Link>
          <Link
            href="/dashboard/posts"
            className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          >
            View my posts
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Posts" value={summary.postCount} />
        <StatCard label="Total views" value={summary.views} />
        <StatCard label="🔥 Reactions" value={summary.fires} />
      </section>

      {/* Recent activity */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent posts</h2>
          <Link
            href="/dashboard/posts"
            className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            View all
          </Link>
        </div>

        <div className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/30">
          {summary.recentPosts.length === 0 ? (
            <div className="p-6 text-sm text-white/70">No posts yet. Create your first one.</div>
          ) : (
            summary.recentPosts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{p.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span>
                      {p.publishedAt ? "Published" : "Draft"} •{" "}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    <span>👁️ {p.viewCount}</span>
                    <span>🔥 {p.fireCount}</span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/posts/${p.slug}`}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/posts/${p.id}/edit`}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
