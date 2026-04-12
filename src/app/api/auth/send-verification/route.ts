import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/http";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { getResend, appUrl, fromEmail } from "@/lib/email/resend";
import { makeVerifyToken, hashVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/server/email-verify";
import { getSession } from "@/lib/auth";
import { checkRateLimit, forgotPasswordLimiter, getIp } from "@/lib/server/rate-limit";

/**
 * POST /api/auth/send-verification
 * Sends (or resends) an email verification link to the signed-in user.
 * Uses the same rate limiter as forgot-password (3 req / 15 min per IP).
 */
export async function POST() {
  const ip = await getIp();
  const limited = await checkRateLimit(forgotPasswordLimiter, ip);
  if (limited) return limited;

  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(ERROR_CODES.UNAUTHORIZED, 401);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) return jsonError(ERROR_CODES.NOT_FOUND, 404);
  if (user.emailVerified) return jsonOk({}, 200); // already verified — no-op

  // Delete any existing tokens for this user before creating a fresh one
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });

  const rawToken = makeVerifyToken();
  const tokenHash = hashVerifyToken(rawToken);
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token: tokenHash,
      expires,
    },
  });

  const url = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

  const resend = getResend();

  if (!resend) {
    console.warn("[send-verification] RESEND_API_KEY missing. Verify link (dev only):", url);
    return jsonOk({}, 200);
  }

  await resend.emails.send({
    from: fromEmail(),
    to: user.email,
    subject: "Verify your Parchment email",
    html: `
      <p>Thanks for joining Parchment.</p>
      <p><a href="${url}">Click here to verify your email address</a> (valid for 24 hours).</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });

  return jsonOk({}, 200);
}
