import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText, PenSquare, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?next=%2Fdashboard%2Fdrafts");

  const drafts = await prisma.post.findMany({
    where: { authorId: session.user.id, publishedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
    },
  });

  return (
    <main className="mx-auto max-w-[845px] px-4 py-8 sm:py-10">
      {/* Header — Back / title / New post, mirroring the dashboard layout */}
      <header className="mb-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Link>
          <Link
            href="/dashboard/posts/new"
            className="inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-md transition-colors hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            <span>New post</span>
          </Link>
        </div>

        <h1 className="text-3xl font-semibold leading-none tracking-tight text-white">
          Your drafts
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {drafts.length === 0
            ? "Nothing in progress right now."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} in progress.`}
        </p>
      </header>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
          <FileText
            className="mx-auto h-6 w-6 text-white/40"
            aria-hidden
          />
          <p className="mt-3 text-base font-medium text-white/85">
            No drafts yet
          </p>
          <p className="mt-1 text-sm text-white/55">
            Start writing — your unpublished posts will land here.
          </p>
          <Link
            href="/dashboard/posts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-md transition-colors hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            <span>New post</span>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {drafts.map((d) => (
            <li key={d.id} className="group">
              <Link
                href={`/dashboard/posts/${d.id}/edit`}
                className="-mx-2 flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-white/5"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/70"
                >
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold leading-tight text-white">
                    {d.title || "Untitled draft"}
                  </span>
                  <span className="mt-1 block text-xs text-white/55">
                    Last edited {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/20 p-2 text-white/70"
                >
                  <PenSquare className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
