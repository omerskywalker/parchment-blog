import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 mb-4 text-[rgb(var(--muted))]">
        Signed in as {session.user.email}
      </p>
      <Link
          href="/dashboard/posts/"
          className="rounded-md border border-white/15 px-15 py-2.5 text-lg text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          Posts
        </Link>
    </main>
  );
}
