import { NextResponse } from "next/server";
import { getAuthedUserId } from "@/lib/server/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";

export type IdCtx = { params: Promise<{ id: string }> };

// --- response envelopes ---

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  code: string;
  message: string;
  issues?: unknown;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function jsonError(
  status: number,
  code: string,
  message = "Something went wrong.",
  issues?: unknown,
) {
  return NextResponse.json(
    {
      ok: false as const,
      code,
      message,
      ...(issues !== undefined ? { issues } : {}),
    },
    { status },
  );
}

// --- auth helpers ---

export async function requireUserId() {
  const userId = await getAuthedUserId();
  return userId ?? null;
}

export async function requireUserAndPostId(ctx: IdCtx) {
  const userId = await requireUserId();
  if (!userId) {
    return {
      ok: false as const,
      res: jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in."),
    };
  }

  const { id } = await ctx.params;
  if (!id) {
    return {
      ok: false as const,
      res: jsonError(400, ERROR_CODES.BAD_REQUEST, "Missing post id."),
    };
  }

  return { ok: true as const, userId, id };
}
