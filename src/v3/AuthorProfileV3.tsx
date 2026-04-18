import Image from "next/image";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://parchment.blog";

type ProfileUser = {
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarKey: string | null;
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    publishedAt: Date | string | null;
    tags: string[];
    viewCount: number;
    fireCount: number;
  }>;
};

interface Props {
  user: ProfileUser;
  totalPosts: number;
  totalReads: number;
  totalFires: number;
}

export default function AuthorProfileV3({ user, totalPosts, totalReads, totalFires }: Props) {
  const displayName = user.name ?? user.username ?? "User";
  const avatarUrl = user.avatarKey
    ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${user.avatarKey}`
    : null;
  const profileUrl = `${SITE_URL}/u/${user.username ?? ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: profileUrl,
    ...(user.bio ? { description: user.bio } : {}),
    ...(avatarUrl ? { image: avatarUrl } : {}),
    publishingPrinciples: SITE_URL,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-[845px] px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/posts"
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          >
            ← Back to posts
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={`${displayName} avatar`} fill priority className="object-cover" />
              ) : (
                <span className="text-xl font-semibold text-white/40 select-none">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    {displayName}
                  </h1>
                  {user.username && (
                    <p className="mt-0.5 text-sm text-white/40">@{user.username}</p>
                  )}
                </div>

                <Link
                  href="/rss.xml"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
                  aria-label="Subscribe via RSS"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                    <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
                  </svg>
                  RSS feed
                </Link>
              </div>

              {user.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-white/70">{user.bio}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                  {totalPosts} {totalPosts === 1 ? "post" : "posts"}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                  {totalReads.toLocaleString()} reads
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                  {totalFires.toLocaleString()} 🔥
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-center gap-4">
          <h2 className="shrink-0 text-sm font-medium tracking-wide text-white/50">Posts</h2>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <section className="mt-4 space-y-3">
          {user.posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
              <p className="text-base font-medium text-white/70">No published posts yet</p>
              <p className="mt-1 text-sm text-white/40">
                {displayName} hasn&apos;t published anything yet. Check back later.
              </p>
            </div>
          ) : (
            user.posts.map((p) => (
              <Link
                key={p.id}
                href={`/posts/${p.slug}`}
                className="block rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/50"
              >
                <h3 className="text-base font-medium text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-white/45">
                  {p.publishedAt
                    ? new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      }).format(new Date(p.publishedAt))
                    : "Unpublished"}
                </p>
                {p.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex items-center gap-3 text-xs text-white/30">
                  <span>{p.viewCount.toLocaleString()} reads</span>
                  {p.fireCount > 0 && <span>{p.fireCount} 🔥</span>}
                </div>
              </Link>
            ))
          )}
        </section>
      </main>
    </>
  );
}
