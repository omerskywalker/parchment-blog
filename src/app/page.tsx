export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Link from "next/link";
import { getPublicPosts } from "@/lib/server/public-posts";
import HomeLatestPosts from "./components/HomeLatestPosts";
import { extractExcerpt } from "@/lib/excerpt";

export const metadata = {
  title: "Parchment — Write Without Noise",
  description:
    "A minimalist blogging platform for independent writers. Publish your thoughts without distraction.",
};

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
    heading: "No algorithm",
    body: "Your posts reach readers in chronological order. No feed manipulation, no pay-to-play reach.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
      </svg>
    ),
    heading: "Distraction-free editor",
    body: "A clean CodeMirror markdown editor with autosave, live preview, and nothing competing for your attention.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    heading: "Your words on the open web",
    body: "Full RSS, sitemap, dynamic OG images, and clean URLs. Readers discover you — not the platform.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const posts = await getPublicPosts();

  // Enrich the top 3 posts with excerpts (server-side)
  const cards = posts.slice(0, 3).map((p) => ({
    ...p,
    excerpt: (p as typeof p & { contentMd?: string }).contentMd
      ? extractExcerpt((p as typeof p & { contentMd?: string }).contentMd!)
      : "",
  }));

  return (
    <main className="mx-auto max-w-[845px] px-4 py-12 sm:py-16">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Parchment
          </h1>
          <p className="mx-auto max-w-md text-base text-white/55 sm:text-lg">
            A home for writing that matters.{" "}
            <span className="text-white/35">
              No algorithmic feeds. No engagement traps. Just your words.
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {isLoggedIn ? (
            <Link
              href="/dashboard/posts/new"
              className="inline-flex items-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90"
            >
              New post →
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90"
              >
                Start writing — it&apos;s free
              </Link>
              <Link
                href="/posts"
                className="text-sm text-white/50 transition hover:text-white/80"
              >
                Browse posts →
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3" aria-label="Platform features">
        {features.map(({ icon, heading, body }) => (
          <div
            key={heading}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"
          >
            <div className="mb-3 inline-flex rounded-lg border border-white/10 bg-white/5 p-2 text-white/60">
              {icon}
            </div>
            <h2 className="text-sm font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{body}</p>
          </div>
        ))}
      </section>

      {/* Latest posts */}
      {cards.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Latest posts</h2>
            <Link href="/posts" className="text-sm text-white/50 transition hover:text-white">
              View all →
            </Link>
          </div>

          <HomeLatestPosts posts={cards} />
        </section>
      )}
    </main>
  );
}
