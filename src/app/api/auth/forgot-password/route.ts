import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/http";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { resend, appUrl, fromEmail } from "@/lib/email/resend";
import { makeResetToken, hashToken } from "@/lib/server/password-reset";
import { z } from "zod";

const emailSchema = z.string().pipe(z.email());

const schema = z.object({
  email: emailSchema,
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(ERROR_CODES.VALIDATION_ERROR, 400);

  const email = parsed.data.email.toLowerCase().trim();

  // prevent leaking whether the email exists
  const okResponse = () => jsonOk({}, 200);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });

  // only credentials users can reset password
  if (!user || !user.passwordHash) return okResponse();

  // clear old tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = makeResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 mins

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  console.log(url); // for dev -- remove in production

  await resend.emails.send({
    from: fromEmail(),
    to: user.email,
    subject: "Reset your Parchment password",
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${url}">Click here to reset your password</a> (valid for 30 minutes).</p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  });

  return okResponse();
}
