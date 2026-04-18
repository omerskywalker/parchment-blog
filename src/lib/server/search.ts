import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type SearchPost = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  readingTimeMin: number;
  viewCount: number;
  tags: string[];
  authorName: string | null;
  authorUsername: string | null;
};

type RawSearchRow = {
  id: string;
  title: string;
  slug: string;
  published_at: Date;
  content_md: string;
  view_count: number;
  tags: string[];
  author_name: string | null;
  author_username: string | null;
};

/**
 * Sanitize a user search query before passing to SQL.
 *
 * - Strips tsquery operators (kept for backwards compatibility — even though
 *   we no longer use tsquery, these characters are still risky in patterns).
 * - Strips % and _ which are SQL LIKE wildcards (otherwise '%' alone would
 *   match every post).
 * - Collapses whitespace.
 * - Returns empty string if nothing remains.
 */
export function sanitizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[&|!():*\\'"<>@%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Estimate reading time: ~200 words per minute.
 */
function readingTime(contentMd: string): number {
  const words = contentMd.trim() === "" ? 0 : contentMd.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Search published posts by substring across title, body, tags, and author.
 *
 * Why ILIKE and not Postgres FTS (tsvector/tsquery)?
 *   - The previous tsquery-based implementation matched literally nothing for
 *     a small blog: stop words were stripped, short queries were stemmed
 *     into oblivion, and tags + author names were never indexed at all, so
 *     searching for "psychology" or an author handle returned zero rows.
 *   - For O(hundreds) of posts, ILIKE on a substring pattern is plenty fast
 *     and behaves the way users actually expect ("does this string appear
 *     anywhere?"). We can revisit if the corpus grows past ~10k rows.
 *
 * Ranking is a sum of weights — title match is worth more than body, body more
 * than tags, tags more than author — and ties break on most-recent-first.
 */
export async function searchPosts(query: string, limit = 20): Promise<SearchPost[]> {
  const safe = sanitizeSearchQuery(query);
  if (!safe) return [];

  const pattern = `%${safe}%`;
  const cappedLimit = Math.min(Math.max(1, Math.floor(limit)), 50);

  const rows = await prisma.$queryRaw<RawSearchRow[]>`
    SELECT
      p.id,
      p.title,
      p.slug,
      p."publishedAt"  AS published_at,
      p."contentMd"    AS content_md,
      p."viewCount"    AS view_count,
      p.tags,
      u.name           AS author_name,
      u.username       AS author_username
    FROM "Post" p
    JOIN "User" u ON u.id = p."authorId"
    WHERE
      p."publishedAt" IS NOT NULL
      AND p."publishedAt" <= NOW()
      AND (
        p.title ILIKE ${pattern}
        OR p."contentMd" ILIKE ${pattern}
        OR EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE t ILIKE ${pattern})
        OR u.name ILIKE ${pattern}
        OR u.username ILIKE ${pattern}
      )
    ORDER BY
      (
        (CASE WHEN p.title ILIKE ${pattern} THEN 8 ELSE 0 END) +
        (CASE WHEN p."contentMd" ILIKE ${pattern} THEN 4 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE t ILIKE ${pattern}) THEN 2 ELSE 0 END) +
        (CASE WHEN u.name ILIKE ${pattern} OR u.username ILIKE ${pattern} THEN 1 ELSE 0 END)
      ) DESC,
      p."publishedAt" DESC
    LIMIT ${Prisma.raw(String(cappedLimit))}
  `;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    publishedAt: r.published_at.toISOString(),
    readingTimeMin: readingTime(r.content_md),
    viewCount: r.view_count ?? 0,
    tags: r.tags ?? [],
    authorName: r.author_name,
    authorUsername: r.author_username,
  }));
}
