import Link from "next/link";
import { getRelatedPosts } from "@/lib/server/public-posts";

type Props = {
  currentSlug: string;
  tags: string[];
};

export async function RelatedPosts({ currentSlug, tags }: Props) {
  const posts = await getRelatedPosts(currentSlug, tags, 3);

  if (!posts.length) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">
        Related posts
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/posts/${post.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-4 transition-[border-color,background-color] hover:border-white/20 hover:bg-black/40"
          >
            <p className="line-clamp-2 text-sm font-medium leading-snug text-white/85 group-hover:text-white">
              {post.title}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/35">
              {post.author.name && <span>{post.author.name}</span>}
              {post.author.name && <span className="text-white/20">·</span>}
              <span>{post.readingTimeMin} min read</span>
              {post.tags.length > 0 && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="truncate">{post.tags[0]}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
