import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/db";

function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

const schema = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return jsonError(500, ERROR_CODES.INTERNAL_ERROR, "S3 not configured.");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return jsonError(404, ERROR_CODES.NOT_FOUND, "User not found.");

  const ext = parsed.data.contentType === "image/png" ? "png" : parsed.data.contentType === "image/webp" ? "webp" : "jpg";
  const key = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: parsed.data.contentType,
    // bucket set to public policy -- if switching to object-level ACLs, use: ACL: "public-read"
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

  return NextResponse.json({ ok: true as const, uploadUrl, key });
}
