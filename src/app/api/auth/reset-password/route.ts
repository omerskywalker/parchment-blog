import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/http";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { hashToken } from "@/lib/server/password-reset";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(10),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(ERROR_CODES.VALIDATION_ERROR, 400);

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    return jsonError("RESET_TOKEN_INVALID", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);

  return jsonOk({}, 200);
}
