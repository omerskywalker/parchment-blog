import { NextResponse } from "next/server";
import { getPublicPostBySlug } from "@/lib/server/public-posts";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://parchment.blog";

/**
 * GET /api/posts/[slug]/markdown
 *
 * Returns the raw post content as a downloadable .md file with a small
 * frontmatter header (title / author / date / source URL). Designed to
 * be opened cleanly by Obsidian, iA Writer, Bear, Logseq, etc.
 *
 * Why a dedicated endpoint instead of inlining the markdown in a
 * <a href="data:..."> link from the client? Two reasons:
 *   1) The post body lives only on the server — the client page renders
 *      compiled HTML, not the source markdown.
 *   2) Browsers cap data: URLs hard (Safari ~2MB) and they don't get a
 *      sensible filename without Content-Disposition. A real endpoint
 *      handles both cleanly.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) {
    return new NextResponse("Not found", { status: 404 });
  }

  const authorName = post.author?.name ?? post.author?.username ?? "Anonymous";
  const dateIso = post.publishedAt ?? post.updatedAt ?? null;
  const url = `${SITE_URL}/posts/${post.slug}`;

  // YAML frontmatter — quoted strings everywhere so colons/quotes in titles
  // don't break parsers like Obsidian's. Tags are emitted as a YAML list
  // when present, otherwise the key is omitted entirely.
  const fm: string[] = ["---"];
  fm.push(`title: ${yamlString(post.title)}`);
  fm.push(`author: ${yamlString(authorName)}`);
  if (dateIso) fm.push(`date: ${dateIso}`);
  fm.push(`source: ${yamlString(url)}`);
  if (post.tags && post.tags.length > 0) {
    fm.push("tags:");
    for (const t of post.tags) fm.push(`  - ${yamlString(t)}`);
  }
  fm.push("---", "");

  const body = `${fm.join("\n")}\n${post.contentMd}\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFilename(post.slug)}.md"`,
      // No caching — keeps re-downloads in sync with edits.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * YAML double-quoted string with backslash and double-quote escaping.
 * That's enough for the fields we emit (title/author/url/tags) — none of
 * these can contain real newlines after the underlying validators.
 */
function yamlString(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Strip non-ASCII from the filename so Content-Disposition stays simple.
 * Slugs are already kebab-case ASCII in this app, but defensive against
 * a future schema change that allows unicode slugs.
 */
function asciiFilename(s: string): string {
  return s.replace(/[^\w\-.]+/g, "-").slice(0, 80) || "post";
}
