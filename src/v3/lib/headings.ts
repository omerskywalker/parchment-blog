/**
 * Server-safe markdown heading extractor + slug helper.
 *
 * Lives in its own module (no "use client") so it can be called from React
 * Server Components like PostDetailV3. The matching client component
 * (TableOfContentsV3) re-imports the type and function from here.
 *
 * `slugify` is exported separately so that the Markdown renderer
 * (src/app/components/Markdown.tsx) can stamp the SAME id onto each
 * rendered <h2>/<h3> that this extractor produces. Sharing one
 * implementation is the only way to guarantee TOC anchor links resolve.
 *
 * Produces GitHub-style anchor IDs to match conventional expectations.
 */

export type Heading = { id: string; text: string; level: number };

/**
 * Convert visible heading text into a URL-safe anchor id.
 *
 * Rules (must stay aligned with Markdown.tsx h2/h3 renderers):
 *   - lowercase
 *   - drop any character that isn't a word char, whitespace, or hyphen
 *   - collapse runs of whitespace into single hyphens
 *   - collapse runs of hyphens
 *   - trim leading/trailing hyphens
 *
 * Note: this strips punctuation INCLUDING apostrophes, so "What's New?"
 * becomes "whats-new" — same as GitHub's anchor algorithm.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split("\n");
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```") || line.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1]!.length;
    const raw = match[2]!.trim();
    const text = raw
      .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
      .replace(/_{1,3}(.*?)_{1,3}/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .trim();

    headings.push({ id: slugify(text), text, level });
  }

  return headings;
}
