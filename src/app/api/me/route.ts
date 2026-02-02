import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: session.user });
}
