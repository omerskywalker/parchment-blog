/**
 * Convert a post's markdown body into plain text suitable for TTS narration.
 *
 * Goals:
 *   - Strip syntax that doesn't translate to speech (code blocks, image
 *     syntax, link URLs, emphasis markers, list bullets, blockquote rules).
 *   - Preserve the actual prose: heading text, paragraph text, link text,
 *     emphasized text.
 *   - Insert sentence-ending periods where the original used a structural
 *     break (heading line, paragraph break) so the TTS engine pauses
 *     naturally instead of running consecutive paragraphs together.
 *
 * This is intentionally a deterministic regex pipeline, not a real
 * markdown parser — TTS doesn't care about structure, only readable
 * text. If the input has weird edge cases (nested code, raw HTML), the
 * worst that happens is a few stray characters get spoken, which is
 * acceptable for v1.
 */
export function markdownToNarrationText(md: string): string {
  let s = md;

  // Drop fenced code blocks entirely — narrating ``` blocks is jarring.
  s = s.replace(/```[\s\S]*?```/g, " ");

  // Drop inline code (`like this`).
  s = s.replace(/`[^`]+`/g, "");

  // Drop image syntax — readers can't see images while listening.
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Replace [text](url) with just the text.
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Strip emphasis markers (*, **, ***, _, __, ___, ~~) but keep inner text.
  s = s.replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, "$2");

  // Headings: drop the leading hashes; append a period only when the
  // heading doesn't already end in terminal punctuation (so we don't
  // produce "Why does this matter?." which the TTS engine pronounces
  // as a glitch).
  s = s.replace(/^#{1,6}\s+(.*)$/gm, (_match, text: string) => {
    const trimmed = text.trim();
    return /[.!?:]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  });

  // Blockquote markers.
  s = s.replace(/^>\s?/gm, "");

  // Horizontal rules — line of --- or *** or ___.
  s = s.replace(/^[-*_]{3,}\s*$/gm, "");

  // List markers (unordered + ordered).
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");

  // Paragraph breaks (\n\n) become sentence-ending pauses.
  // Single newlines collapse to spaces.
  s = s.replace(/\n{2,}/g, ". ").replace(/\n/g, " ");

  // Collapse runs of whitespace.
  s = s.replace(/\s+/g, " ").trim();

  // Tighten doubled punctuation introduced by paragraph-period insertion
  // (e.g. heading ending in "?" followed by added "." gives "?.").
  s = s.replace(/([.!?])\s*\./g, "$1");
  s = s.replace(/\.\s*\./g, ".");

  return s;
}

/**
 * Should a post be eligible for audio narration at all?
 *
 * Cap input size to keep TTS cost + latency predictable. tts-1 accepts
 * up to 4096 chars per call; we set a slightly lower threshold so every
 * call is single-shot (no chunking + concatenation in v1).
 */
export const MAX_NARRATION_CHARS = 4000;

export function isNarratable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false;
  return true;
}
