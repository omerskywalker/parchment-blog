import Link from "next/link";
import { getAdjacentPosts } from "@/lib/server/public-posts";

type Props = { slug: string };

export async function PrevNextNav({ slug }: Props) {
  const { prev, next } = await getAdjacentPosts(slug);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Previous and next post"
      className="mt-8 flex items-stretch gap-3"
    >
      {prev ? (
        <Link
          href={`/posts/${prev.slug}`}
          className="group flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition-[border-color,background-color] hover:border-white/20 hover:bg-black/40"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-white/35">
            ← Previous
          </span>
          <span className="line-clamp-2 text-sm font-medium text-white/80 group-hover:text-white">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          className="group flex min-w-0 flex-1 flex-col items-end gap-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-right transition-[border-color,background-color] hover:border-white/20 hover:bg-black/40"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-white/35">
            Next →
          </span>
          <span className="line-clamp-2 text-sm font-medium text-white/80 group-hover:text-white">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
