import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { s3PublicUrlFromKey } from "./s3";

describe("s3PublicUrlFromKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null for null key", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-east-1";
    expect(s3PublicUrlFromKey(null)).toBeNull();
  });

  it("returns null for undefined key", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-east-1";
    expect(s3PublicUrlFromKey(undefined)).toBeNull();
  });

  it("returns null when bucket env var is missing", () => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.NEXT_PUBLIC_AWS_S3_BUCKET;
    process.env.AWS_REGION = "us-east-1";
    expect(s3PublicUrlFromKey("avatars/user.jpg")).toBeNull();
  });

  it("returns null when region env var is missing", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    delete process.env.AWS_REGION;
    delete process.env.NEXT_PUBLIC_AWS_REGION;
    expect(s3PublicUrlFromKey("avatars/user.jpg")).toBeNull();
  });

  it("constructs correct S3 URL", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    process.env.AWS_REGION = "us-east-1";
    expect(s3PublicUrlFromKey("avatars/user.jpg")).toBe(
      "https://my-bucket.s3.us-east-1.amazonaws.com/avatars/user.jpg"
    );
  });

  it("uses NEXT_PUBLIC_ env vars as fallback", () => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_REGION;
    process.env.NEXT_PUBLIC_AWS_S3_BUCKET = "public-bucket";
    process.env.NEXT_PUBLIC_AWS_REGION = "eu-west-1";
    expect(s3PublicUrlFromKey("file.png")).toBe(
      "https://public-bucket.s3.eu-west-1.amazonaws.com/file.png"
    );
  });
});
