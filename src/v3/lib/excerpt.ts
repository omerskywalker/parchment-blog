/**
 * Extract a plain-text excerpt (~160 chars) from markdown, stripping syntax.
 * Used by v3 feed cards to give readers a preview of each post.
 */
export function extractExcerpt(markdown: string, maxLen = 160): string {
  if (!markdown) return "";

  const blocks = markdown
    // Strip fenced code blocks
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/);

  for (const block of blocks) {
    const stripped = block
      .trim()
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, "$2")
      .replace(/`[^`]+`/g, "")
      .replace(/^>\s+/gm, "")
      .replace(/^[-*_]{3,}\s*$/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    if (stripped.length > 20) {
      return stripped.length > maxLen
        ? stripped.slice(0, maxLen - 1).trimEnd() + "…"
        : stripped;
    }
  }
  return "";
}
