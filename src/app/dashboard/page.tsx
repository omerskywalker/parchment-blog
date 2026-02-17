import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <p className="mt-2 text-[rgb(var(--muted))]">
        {session?.user?.email
          ? `Signed in as ${session.user.email}`
          : "Manage your drafts and published posts."}
      </p>

      <div className="mt-4">
        <Link
          href="/dashboard/posts"
          className="inline-flex rounded-md border border-white/15 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          My posts
        </Link>
      </div>
    </main>
  );
}
