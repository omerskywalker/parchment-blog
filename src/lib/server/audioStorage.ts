import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, S3_REGION, s3 } from "./s3";

/** S3 object key for a post's narration audio. Stable per (postId, voice). */
export function audioObjectKey(postId: string, voice: string): string {
  return `audio/${postId}/${voice}.mp3`;
}

/** Public HTTPS URL for a stored audio object. */
export function audioPublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
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
