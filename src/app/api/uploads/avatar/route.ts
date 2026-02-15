import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, S3_BUCKET, S3_REGION } from "@/lib/server/s3";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

const schema = z.object({
  contentType: z.string().min(1), // "image/png", "image/jpeg", ...
});

export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", parsed.error.flatten());
  }

  const { contentType } = parsed.data;

  // basic allowlist
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(contentType)) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Unsupported image type.");
  }

  // key: avatars/<user>/<random>.png
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const rand = crypto.randomBytes(16).toString("hex");
  const key = `avatars/${crypto.createHash("sha1").update(email).digest("hex")}/${rand}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 60s

  // the final URL:
  const publicUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

  return NextResponse.json({
    ok: true as const,
    key,
    uploadUrl,
    publicUrl,
  });
}
