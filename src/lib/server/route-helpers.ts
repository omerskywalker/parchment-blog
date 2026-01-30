import { NextResponse } from "next/server";
import { getAuthedUserId } from "@/lib/server/auth";

export type IdCtx = { params: Promise<{ id: string }> };

export function jsonError(status: number, error: string, message?: string, issues?: unknown) {
  return NextResponse.json({ ok: false as const, error, message, issues }, { status });
}

export async function requireUserId() {
  const userId = await getAuthedUserId();
  if (!userId) return null;
  return userId;
}

export async function requireUserAndPostId(ctx: IdCtx) {
  const userId = await requireUserId();
  if (!userId)
    return { ok: false as const, res: jsonError(401, "UNAUTHORIZED", "You must be signed in.") };

  const { id } = await ctx.params;
  if (!id) return { ok: false as const, res: jsonError(400, "BAD_REQUEST", "Missing post id.") };

  return { ok: true as const, userId, id };
}
