import { openai } from "./openai";

export type NarrationVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/** Brand voice for Parchment narrations. */
export const DEFAULT_VOICE: NarrationVoice = "onyx";

/**
 * Generate an MP3 narration of the given plain-text body.
 *
 * Returns the raw MP3 bytes — the caller is responsible for uploading to
 * S3 and wiring up the response. Throws on TTS failure; the route handler
 * should translate to a 502.
 *
 * Cost reference (tts-1): ~$0.015 per 1k characters.
 */
export async function generateNarrationMp3(
  text: string,
  voice: NarrationVoice = DEFAULT_VOICE,
): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("generateNarrationMp3: empty input text");
  }

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: trimmed,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Rough duration estimate from byte count.
 *
 * tts-1 emits ~16 KB/sec for typical narration. Used only for a UX hint
 * (player shows estimated total time before metadata loads). Replaced by
 * the real value once the <audio> element parses the file's metadata.
 */
export function estimateMp3DurationSec(byteLength: number): number {
  const APPROX_BYTES_PER_SECOND = 16_000;
  return Math.max(1, Math.round(byteLength / APPROX_BYTES_PER_SECOND));
}
