import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, S3_REGION, s3 } from "./s3";

/** S3 object key for a post's (legacy single-file) narration audio.
 *  Stable per (postId, voice). New generations use segment keys
 *  (see audioSegmentObjectKey) but old rows still reference this. */
export function audioObjectKey(postId: string, voice: string): string {
  return `audio/${postId}/${voice}.mp3`;
}

/** S3 object key for one chunk of a multi-segment narration. Indexed
 *  per chunk so each (postId, voice, index) writes to its own object,
 *  letting the player swap <audio src> across segments cleanly. The
 *  legacy single-file key (above) is treated as the implicit segment 0
 *  for back-compat with rows generated before chunking landed. */
export function audioSegmentObjectKey(
  postId: string,
  voice: string,
  index: number,
): string {
  return `audio/${postId}/${voice}-${index}.mp3`;
}

/** Public HTTPS URL for a stored audio object. */
export function audioPublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Versioned public URL — same object, but with a deterministic cache-buster
 * appended as a query string. Because we set immutable+1y Cache-Control on
 * the S3 object and reuse a stable key per (postId, voice), regenerated audio
 * would otherwise stay stuck in browser/CDN caches for up to a year. The
 * version token (charCount-durationSec) changes whenever the audio content
 * changes, so clients fetch the new bytes immediately while still benefiting
 * from long caching of unchanged audio.
 */
export function audioPublicUrlVersioned(
  key: string,
  charCount: number,
  durationSec: number,
): string {
  return `${audioPublicUrl(key)}?v=${charCount}-${durationSec}`;
}

/**
 * Upload an MP3 narration to S3.
 *
 * Sets long-lived immutable cache headers — the audio for a given post
 * either matches its current text (cached row in Postgres confirms it)
 * or it doesn't (we delete + regenerate, which writes to the same key
 * and invalidates downstream caches via the cache-busting query string
 * appended at read time).
 */
export async function putAudioObject(key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/** Best-effort delete; swallow errors so a failed cleanup doesn't block writes. */
export async function deleteAudioObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch {
    // Ignore — orphaned audio objects are harmless and rare.
  }
}
