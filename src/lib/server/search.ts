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
 * - Strips tsquery operators (kept defensively even though we no longer use
 *   tsquery — these characters are still risky in patterns).
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
 * Split a sanitized query into per-word patterns, each wrapped with %…%.
 * Exported so the test suite can pin the contract.
 */
export function buildWordPatterns(safe: string): string[] {
  if (!safe) return [];
  return safe.split(/\s+/).filter(Boolean).map((w) => `%${w}%`);
}

/**
 * Search published posts by substring across title, body, tags, and author.
 *
 * Matching strategy:
 *   - Sanitize the query, then split on whitespace into words.
 *   - A post matches if EVERY word appears in at least one searchable field
 *     (title, body, tag, author name, or author username). Word order doesn't
 *     matter, so "tiny mate" still finds "The Tiny Roommate".
 *   - Substring matching is case-insensitive (ILIKE), so "cla" finds
 *     "Claude code power commands" — no minimum query length.
 *
 * Ranking:
 *   - Posts where the FULL phrase appears in the title rank highest, then
 *     body, then tags, then author. Ties break on most-recent-first.
 *   - This keeps phrase-precise hits at the top while still surfacing the
 *     "any-word-anywhere" matches below.
 *
 * Why ILIKE and not Postgres FTS (tsvector/tsquery)?
 *   - The previous tsquery implementation matched literally nothing for a
 *     small blog: stop words were stripped, short queries were stemmed
 *     into oblivion ('cla' became no match for 'claude'), and tags + author
 *     names were never indexed at all.
 *   - For O(hundreds) of posts, ILIKE is plenty fast and behaves the way
 *     users expect. We can revisit if the corpus grows past ~10k rows.
 */
export async function searchPosts(query: string, limit = 20): Promise<SearchPost[]> {
  const safe = sanitizeSearchQuery(query);
  if (!safe) return [];

  const wordPatterns = buildWordPatterns(safe);
  const fullPattern = `%${safe}%`;
  const cappedLimit = Math.min(Math.max(1, Math.floor(limit)), 50);

  // For each word, build an OR across searchable fields. Then AND the words
  // together so all words must appear somewhere across the row.
  const perWordConditions = wordPatterns.map(
    (p) => Prisma.sql`(
      p.title ILIKE ${p}
      OR p."contentMd" ILIKE ${p}
      OR EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE t ILIKE ${p})
      OR u.name ILIKE ${p}
      OR u.username ILIKE ${p}
    )`,
  );
  const whereWords = Prisma.join(perWordConditions, " AND ");

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
      AND (${whereWords})
    ORDER BY
      (
        (CASE WHEN p.title ILIKE ${fullPattern} THEN 16 ELSE 0 END) +
        (CASE WHEN p."contentMd" ILIKE ${fullPattern} THEN 8 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE t ILIKE ${fullPattern}) THEN 4 ELSE 0 END) +
        (CASE WHEN u.name ILIKE ${fullPattern} OR u.username ILIKE ${fullPattern} THEN 2 ELSE 0 END)
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
