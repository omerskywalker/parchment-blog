const WORDS_PER_MINUTE = 125;

// quick + stable markdown -> word count
export function estimateReadingTimeMinutes(markdown: string): number {
  if (!markdown) return 1;

  // remove fenced code blocks
  const noCodeBlocks = markdown.replace(/```[\s\S]*?```/g, " ");

  // remove inline code
  const noInlineCode = noCodeBlocks.replace(/`[^`]*`/g, " ");

  // remove markdown links but keep link text: [text](url) -> text
  const keepLinkText = noInlineCode.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // remove images: ![alt](url) -> alt
  const keepAltText = keepLinkText.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // strip remaining markdown punctuation (light touch)
  const stripped = keepAltText.replace(/[>*_#[\]()`~\-]/g, " ");

  // collapse whitespace
  const words = stripped
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.ceil(words / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}
