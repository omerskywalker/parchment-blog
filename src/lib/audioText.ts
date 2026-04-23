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
 * Hard ceiling on TOTAL narratable characters per post. Posts above
 * this are truncated — keeps cost predictable for pathological inputs.
 * 60k chars is roughly a 60-minute read, comfortably above any real
 * blog post we'd reasonably narrate.
 */
export const MAX_NARRATION_CHARS = 60_000;

/**
 * Per-chunk target. tts-1 accepts up to 4096 chars; we leave a 500-char
 * safety margin so an off-by-one near a paragraph break doesn't reject
 * the call. Below the OpenAI ceiling, smaller chunks generate faster
 * and yield finer-grained scrub resolution; larger chunks reduce the
 * number of seams. ~3500 is a comfortable middle.
 */
export const TARGET_CHUNK_CHARS = 3500;

/**
 * How many sentences from the END of chunk N to duplicate at the
 * START of chunk N+1. The duplication is purely TTS context — the
 * player skips it on playback so the listener hears each sentence
 * once. With it, the TTS engine generates chunk N+1's opening with
 * full prosodic awareness of what just preceded it (warmed-up voice,
 * matching cadence), eliminating the abrupt "fresh start" feel that
 * a cold cut would produce at every seam.
 */
export const OVERLAP_SENTENCES = 2;

export function isNarratable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false;
  return true;
}

/**
 * Reduce narration text to the slice we actually intend to send to TTS.
 * Cuts on a word boundary at MAX_NARRATION_CHARS so we never split
 * mid-word. Both the cache-check route and the generate route call
 * this so `charCount` written at generation time always matches the
 * value compared at read time.
 */
export function prepareNarrationInput(text: string): string {
  if (text.length <= MAX_NARRATION_CHARS) return text;
  const cutAt = text.lastIndexOf(" ", MAX_NARRATION_CHARS);
  return text.slice(0, cutAt > 0 ? cutAt : MAX_NARRATION_CHARS);
}

/**
 * Result of splitting a narration into TTS-sized chunks.
 *
 *  - `text` is what we send to TTS for this chunk (includes any
 *    overlap from the previous chunk's tail at its start).
 *  - `charCount` is `text.length` — duplicated for clarity at
 *    consumption sites that don't want to recompute.
 *  - `overlapChars` is how many leading characters of `text` are
 *    duplicated from the previous chunk. Always 0 for chunk 0.
 *    The player uses this + the chunk's measured durationSec to
 *    compute a skip offset so the listener doesn't hear the
 *    overlap twice.
 */
export type NarrationChunk = {
  text: string;
  charCount: number;
  overlapChars: number;
};

/**
 * Split a sentence-bearing string into sentence units. Splits on
 *   - ASCII sentence terminators (. ! ?) followed by whitespace,
 *   - the heading ellipsis (U+2026) we emit from markdownToNarrationText.
 * Every emitted unit retains its trailing punctuation + the single
 * separating space, so re-joining yields the original string.
 *
 * Exported for tests; not used by callers other than chunkNarrationText.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Match: any chars (lazy) up to and including a terminator + space,
  // OR up to and including a terminator at end-of-string.
  // Terminators: . ! ? \u2026 — optionally followed by closing quotes/brackets.
  const re = /[\s\S]*?(?:[.!?\u2026]+["'\u201d\u2019)\]]?(?:\s+|$))|[\s\S]+$/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const piece = m[0];
    if (piece.trim().length > 0) out.push(piece);
    // Guard against zero-length match infinite loop.
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  return out;
}

/**
 * Pack a long narration into chunks suitable for TTS, with overlap.
 *
 * Algorithm:
 *   1. Split into sentences.
 *   2. Greedily fill the current chunk one sentence at a time until
 *      adding the next sentence would exceed TARGET_CHUNK_CHARS. The
 *      first sentence always goes in, even if it alone is longer than
 *      the target — pathological "one giant sentence" posts still get
 *      narrated, just with a single oversize chunk.
 *   3. When sealing a chunk, remember its last OVERLAP_SENTENCES so
 *      the next chunk can be seeded with them as overlap.
 *
 * Edge cases:
 *   - Single short post (≤ TARGET_CHUNK_CHARS) → returns one chunk
 *     with overlapChars=0.
 *   - Empty/whitespace-only input → returns [].
 */
export function chunkNarrationText(text: string): NarrationChunk[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) return [];

  const chunks: NarrationChunk[] = [];
  let buffer: string[] = [];
  let bufferLen = 0;
  let overlapChars = 0;

  const seal = () => {
    if (buffer.length === 0) return;
    const t = buffer.join("");
    chunks.push({
      text: t,
      charCount: t.length,
      overlapChars,
    });
    // Seed next chunk with the trailing OVERLAP_SENTENCES of this one
    // so TTS gets prosodic context. The first chunk has no overlap
    // (overlapChars=0); every subsequent chunk's overlapChars equals
    // the length of these prepended sentences.
    const tail = buffer.slice(-OVERLAP_SENTENCES);
    const overlapText = tail.join("");
    overlapChars = overlapText.length;
    buffer = [...tail];
    bufferLen = overlapText.length;
  };

  for (const s of sentences) {
    // First sentence into a fresh buffer always goes in, even if it's
    // already larger than the target — better to ship one oversize
    // chunk than to drop content. After that, seal+restart on overflow.
    const fresh = bufferLen === overlapChars; // only the carried-over overlap is in buffer
    if (!fresh && bufferLen + s.length > TARGET_CHUNK_CHARS) {
      seal();
    }
    buffer.push(s);
    bufferLen += s.length;
  }

  if (buffer.length > 0) {
    const t = buffer.join("");
    chunks.push({
      text: t,
      charCount: t.length,
      overlapChars,
    });
  }

  return chunks;
}
