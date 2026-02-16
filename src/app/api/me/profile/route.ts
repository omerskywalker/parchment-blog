import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

const patchSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, "Only letters, numbers, underscore.")
    .optional(),
  bio: z.string().max(280).optional(),
  avatarKey: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, username: true, bio: true, avatarKey: true },
  });

  if (!user) return jsonError(404, ERROR_CODES.NOT_FOUND, "User not found.");

  return NextResponse.json({ ok: true as const, user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", parsed.error.flatten());
  }

  // normalize username to lowercase (optional but recommended)
  const username =
    parsed.data.username !== undefined ? parsed.data.username.trim().toLowerCase() : undefined;

  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.avatarKey !== undefined ? { avatarKey: parsed.data.avatarKey } : {}),
      },
      select: { id: true, name: true, email: true, username: true, bio: true, avatarKey: true },
    });

    return NextResponse.json({ ok: true as const, user });
  } catch {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Could not update profile (maybe username taken).");
  }
}
