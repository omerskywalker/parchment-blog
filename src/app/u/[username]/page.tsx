import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findFirst({
    where: { username },
    select: {
      name: true,
      username: true,
      bio: true,
      avatarKey: true,
      posts: {
        where: { publishedAt: { not: null } },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          updatedAt: true,
          tags: true,
        },
      },
    },
  });

  if (!user) notFound();

  const displayName = user.name ?? user.username ?? "User";

  const avatarUrl =
  user.avatarKey
    ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${user.avatarKey}`
    : null;


  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-white/50">@{user.username}</p>
            {user.bio ? (
              <p className="mt-3 text-white/80">{user.bio}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {user.posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-white/80">No published posts yet.</p>
          </div>
        ) : (
          user.posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.slug}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:bg-black/50 hover:-translate-y-0.5 hover:border-white"
            >
              <h2 className="text-lg font-medium text-white">{p.title}</h2>
              <p className="mt-1 text-sm text-white/50">
                {p.publishedAt
                  ? new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    }).format(new Date(p.publishedAt))
                  : "Unpublished"}
              </p>
              {p.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
