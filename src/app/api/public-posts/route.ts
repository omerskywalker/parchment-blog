import { NextResponse } from "next/server";
import { getPublicPostsPage } from "@/lib/server/public-posts";
import { ERROR_CODES } from "@/lib/server/error-codes";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json({ ok: false as const, error, message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const cursor = url.searchParams.get("cursor");
    const takeRaw = url.searchParams.get("take");

    const parsedTake = takeRaw ? Number(takeRaw) : undefined;
    const take = Number.isFinite(parsedTake) ? parsedTake : undefined;

    const data = await getPublicPostsPage({ cursor, take });

    return NextResponse.json({ ok: true as const, ...data });
  } catch (err) {
    console.error("GET /api/public-posts error:", err);
    return jsonError(500, ERROR_CODES.INTERNAL_ERROR, "Something went wrong.");
  }
}
