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

  // Headings: drop the leading hashes and append a Unicode ellipsis
  // (U+2026) as a longer-than-normal pause cue. tts-1 reads "…" as
  // a beat noticeably longer than a comma or period, which is what
  // makes section breaks land in the spoken audio. The ellipsis is
  // a single non-ASCII character, so the cleanup regexes below
  // (which target ASCII `.`) leave it untouched. We strip any
  // existing terminal punctuation so we don't produce "matter?…"
  // which the TTS engine reads as a glitch.
  s = s.replace(/^#{1,6}\s+(.*)$/gm, (_match, text: string) => {
    const trimmed = text.trim().replace(/[.!?:]+$/, "");
    return `${trimmed}\u2026`;
  });

  // When a heading is followed by a paragraph break, the ellipsis
  // already provides the pause — don't tack on the regular ". "
  // sentinel below. Otherwise we'd emit "Title…. Body" with two
  // pause cues stacked, which sounds like a stutter.
  s = s.replace(/\u2026\s*\n{2,}/g, "\u2026 ");

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

/**
 * Reduce narration text to the exact slice that will be (or was) sent to TTS.
 * Cuts on a word boundary at MAX_NARRATION_CHARS so we never split mid-word.
 *
 * Both the GET cache-check route and the POST generate route call this so
 * `charCount` written at generation time always matches the value compared
 * at read time — without this, long posts (>4000 chars) would always look
 * stale on GET because GET would compare against the FULL text length while
 * POST stored the TRUNCATED length.
 */
export function prepareNarrationInput(text: string): string {
  if (text.length <= MAX_NARRATION_CHARS) return text;
  const cutAt = text.lastIndexOf(" ", MAX_NARRATION_CHARS);
  return text.slice(0, cutAt > 0 ? cutAt : MAX_NARRATION_CHARS);
}
