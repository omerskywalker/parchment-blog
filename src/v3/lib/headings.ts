/**
 * Server-safe markdown heading extractor.
 *
 * Lives in its own module (no "use client") so it can be called from React
 * Server Components like PostDetailV3. The matching client component
 * (TableOfContentsV3) re-imports the type and function from here.
 *
 * Produces GitHub-style anchor IDs to match what react-markdown + remark-gfm
 * generate when rendering the same headings on the page.
 */

export type Heading = { id: string; text: string; level: number };

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

    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    headings.push({ id, text, level });
  }

  return headings;
}
