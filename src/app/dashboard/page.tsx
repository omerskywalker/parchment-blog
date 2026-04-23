import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus, Flame, Eye, PenSquare, ArrowRight, Headphones, FileText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/server/dashboard";
import { prisma } from "@/lib/db";
import { s3PublicUrlFromKey } from "@/lib/s3";
import {
  getDashboardOnboardingItems,
  getOnboardingProgress,
} from "@/lib/onboarding";
import { DashboardInsights } from "./_components/DashboardInsights";

function StatCell({
  label,
  value,
  accent,
  className,
}: {
  label: React.ReactNode;
  value: number | string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center p-4 text-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div
        className={[
          "mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider",
          accent ? "text-white/85 font-medium" : "text-white/55",
        ].join(" ")}
      >
        {label}
      </div>
    </div>
  );
}

function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  searchParams?: Promise<{ verified?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?next=%2Fdashboard");

  const sp = (await searchParams) ?? {};
  const verified = sp.verified === "1";

  const [summary, user] = await Promise.all([
    getDashboardSummary(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailVerified: true,
        passwordHash: true,
        bio: true,
        avatarKey: true,
        name: true,
        username: true,
      },
    }),
  ]);

  const displayName =
    session.user.name ??
    user?.name ??
    session.user.username ??
    user?.username ??
    "Writer";

  const avatarUrl = s3PublicUrlFromKey(user?.avatarKey);

  const onboardingItems = getDashboardOnboardingItems({
    isCredentialsUser: Boolean(user?.passwordHash),
    emailVerified: Boolean(user?.emailVerified),
    hasBio: Boolean(user?.bio?.trim()),
    hasAvatar: Boolean(user?.avatarKey),
    postCount: summary.postCount,
  });

  const onboardingProgress = getOnboardingProgress(onboardingItems);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-10">
      {verified ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Your email is verified. Your account is fully unlocked.
        </div>
      ) : null}

      <header className="mb-8">
        {/* Top row — "Logged in as" block on the left, "+ New post" on the right */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">
              Logged in as
            </span>
            <span className="dashboard-email-value mt-0.5 truncate text-sm font-medium">
              {session.user.email}
            </span>
          </div>
          <Link
            href="/dashboard/posts/new"
            className="inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-md transition-colors hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            <span>New post</span>
          </Link>
        </div>

        {/* Title row — avatar (if any) + dashboard heading */}
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 flex-shrink-0 rounded-full border border-white/15 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white/85"
            >
              {initialsFromName(displayName) || "·"}
            </span>
          )}
          <h1 className="min-w-0 truncate text-3xl font-semibold leading-none tracking-tight text-white">
            {capitalizeEachWord(displayName)}&apos;s Dashboard
          </h1>
        </div>
      </header>

      {!onboardingProgress.done ? (
        <section className="mb-8 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Finish setting up your account
              </h2>
              <p className="mt-1 text-sm text-white/55">
                {onboardingProgress.completed} of {onboardingProgress.total}{" "}
                steps complete.
              </p>
            </div>

            <Link
              href="/dashboard/profile"
              className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
            >
              Review profile
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {onboardingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      item.done
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-white/10 text-white/55",
                    ].join(" ")}
                    aria-hidden
                  >
                    {item.done ? "✓" : "•"}
                  </span>
                  <span className={item.done ? "text-white/60" : "text-white/90"}>
                    {item.label}
                  </span>
                </div>

                {!item.done ? (
                  <Link
                    href={item.href}
                    className="text-xs text-white/70 underline underline-offset-4 hover:text-white"
                  >
                    Complete
                  </Link>
                ) : (
                  <span className="text-xs text-emerald-200">Done</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Stats — tight 2x2 grid with explicit per-cell borders so dividers
          are visible in both dark mode and sepia (border-white/10 has a
          sepia override that maps to var(--pb-border)). */}
      <section className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <StatCell
          label="Posts"
          value={summary.postCount}
          className="border-b border-r border-white/10"
        />
        <StatCell
          label="Views"
          value={summary.views}
          className="border-b border-white/10"
        />
        <StatCell
          label={
            <>
              <Flame className="h-3 w-3" /> Reactions
            </>
          }
          value={summary.fires}
          accent
          className="border-r border-white/10"
        />
        <StatCell
          label={
            <>
              <Headphones className="h-3 w-3" /> Listens
            </>
          }
          value={summary.listens}
        />
      </section>

      {/* AI insights — collapsed by default */}
      <div className="mb-10">
        <DashboardInsights />
      </div>

      {/* Your drafts — single most-recent draft preview, full list at /dashboard/drafts.
          Hidden when the author has no drafts so the dashboard stays tight. */}
      {summary.latestDraft ? (
        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Your drafts
            </h2>
            <Link
              href="/dashboard/drafts"
              className="inline-flex items-center gap-1 text-xs font-medium text-white/70 transition-colors hover:text-white"
            >
              View all{summary.draftCount > 1 ? ` (${summary.draftCount})` : ""}{" "}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Link
            href={`/dashboard/posts/${summary.latestDraft.id}/edit`}
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
                {summary.latestDraft.title || "Untitled draft"}
              </span>
              <span className="mt-1 block text-xs text-white/55">
                Last edited{" "}
                {new Date(summary.latestDraft.updatedAt).toLocaleDateString()}
              </span>
            </span>
            <span
              aria-hidden
              className="flex flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/20 p-2 text-white/70"
            >
              <PenSquare className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>
      ) : null}

      {/* Recent posts */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Recent posts
          </h2>
          <Link
            href="/dashboard/posts"
            className="inline-flex items-center gap-1 text-xs font-medium text-white/70 transition-colors hover:text-white"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {summary.recentPosts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/70">
            No posts yet. Create your first one.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {summary.recentPosts.map((p) => {
              const isDraft = !p.publishedAt;
              const href = isDraft
                ? `/dashboard/posts/${p.id}/edit`
                : `/posts/${p.slug}`;
              return (
                <li key={p.id} className="group">
                  <div className="-mx-2 flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-white/5">
                    <Link
                      href={href}
                      className="flex min-w-0 flex-1 flex-col gap-2"
                    >
                      <h3 className="truncate text-base font-semibold leading-tight text-white">
                        {p.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
                        <span
                          className={[
                            "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                            isDraft
                              ? "bg-white/10 text-white/70"
                              : "bg-emerald-500/15 text-emerald-200",
                          ].join(" ")}
                        >
                          {isDraft ? "Draft" : "Published"}
                        </span>
                        <span>
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {p.viewCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3 w-3" /> {p.fireCount}
                        </span>
                      </div>
                    </Link>
                    <Link
                      href={`/dashboard/posts/${p.id}/edit`}
                      aria-label={`Edit ${p.title}`}
                      className="flex flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/20 p-2 text-white/70 transition-colors hover:border-white/30 hover:text-white"
                    >
                      <PenSquare className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
