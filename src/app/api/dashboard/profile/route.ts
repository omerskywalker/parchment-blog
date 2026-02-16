import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { z } from "zod";

function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

const patchSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i, "Username can only contain letters, numbers, and underscores.")
    .optional(),
  bio: z.string().max(280).optional(),
  avatarKey: z.string().max(512).optional(),
});

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, username: true, bio: true, avatarKey: true },
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
    return jsonError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid input.", z.treeifyError(parsed.error));
  }

  const { username, bio, avatarKey } = parsed.data;

  // normalize username
  const usernameLower = typeof username === "string" ? username.trim().toLowerCase() : undefined;

  try {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        ...(usernameLower !== undefined ? { username: usernameLower } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarKey !== undefined ? { avatarKey } : {}),
      },
      select: { email: true, name: true, username: true, bio: true, avatarKey: true },
    });

    return NextResponse.json({ ok: true as const, user: updated });
  } catch (err) {
    // handle unique constraint on username
    const msg = (err as Error).message ?? "";
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return jsonError(409, ERROR_CODES.CONFLICT, "That username is already taken.");
    }
    return jsonError(500, ERROR_CODES.INTERNAL_ERROR, "Failed to update profile.");
  }
}
