import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { hashVerifyToken } from "@/lib/server/email-verify";

/**
 * GET /api/auth/verify-email?token=<rawToken>
 * Verifies the email address associated with the token.
 * On success redirects to /dashboard; on failure redirects to /verify-email?error=1
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get("token");

  if (!rawToken || rawToken.length < 10) {
    return jsonError(ERROR_CODES.BAD_REQUEST, 400);
  }

  const tokenHash = hashVerifyToken(rawToken);

  const record = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", req.url),
    );
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } });
    return NextResponse.redirect(
      new URL("/verify-email?error=expired", req.url),
    );
  }

  // Mark the user as verified
  await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  // Clean up the token
  await prisma.verificationToken.delete({ where: { token: tokenHash } });

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
