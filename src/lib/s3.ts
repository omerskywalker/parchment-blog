// src/lib/s3.ts
export function s3PublicUrlFromKey(key: string | null | undefined) {
    if (!key) return null;
  
    const bucket =
      process.env.AWS_S3_BUCKET ?? process.env.NEXT_PUBLIC_AWS_S3_BUCKET;
    const region =
      process.env.AWS_REGION ?? process.env.NEXT_PUBLIC_AWS_REGION;
  
    if (!bucket || !region) return null;
  
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  