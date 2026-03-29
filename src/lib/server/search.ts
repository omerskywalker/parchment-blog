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
 * Sanitize a user search query before passing to tsquery.
 * - Strips characters that are special to tsquery/tsquery operators
 * - Collapses whitespace
 * - Returns empty string if nothing remains
 */
export function sanitizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[&|!():*\\'"<>@]/g, " ")
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
 * Full-text search over published posts using Postgres tsvector.
 * Searches title and content. Returns up to `limit` results ordered by rank.
 */
export async function searchPosts(query: string, limit = 20): Promise<SearchPost[]> {
  const safe = sanitizeSearchQuery(query);
  if (!safe) return [];

  // Build a plainto_tsquery from the sanitised input — safe against injection
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
      AND to_tsvector('english', p.title || ' ' || p."contentMd")
          @@ plainto_tsquery('english', ${safe})
    ORDER BY
      ts_rank(
        to_tsvector('english', p.title || ' ' || p."contentMd"),
        plainto_tsquery('english', ${safe})
      ) DESC,
      p."publishedAt" DESC
    LIMIT ${Prisma.raw(String(Math.min(limit, 50)))}
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
