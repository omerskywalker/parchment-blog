import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

type Props = { params: Promise<{ username: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      username: true,
      bio: true,
      avatarKey: true,
      posts: {
        where: { publishedAt: { not: null } },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 10,
        select: { id: true, title: true, slug: true, publishedAt: true },
      },
    },
  });

  if (!user) notFound();

  const avatarUrl = user.avatarKey
    ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${user.avatarKey}`
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white">
              {user.name ?? user.username}
            </h1>
            <p className="text-sm text-white/50">@{user.username}</p>
            {user.bio ? <p className="mt-3 text-white/80">{user.bio}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {user.posts.map((p) => (
          <Link
            key={p.id}
            href={`/posts/${p.slug}`}
            className="block rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:bg-black/50 hover:border-white"
          >
            <div className="text-white">{p.title}</div>
            <div className="mt-1 text-sm text-white/50">
              {p.publishedAt
                ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(
                    new Date(p.publishedAt),
                  )
                : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
