import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

const schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i).optional(),
  bio: z.string().max(280).optional(),
  avatarKey: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        ...(parsed.data.username !== undefined ? { username: parsed.data.username } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.avatarKey !== undefined ? { avatarKey: parsed.data.avatarKey } : {}),
      },
      select: { id: true, username: true, bio: true, avatarKey: true },
    });

    return NextResponse.json({ ok: true as const, user });
  } catch {
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Could not update profile.");
  }
}
