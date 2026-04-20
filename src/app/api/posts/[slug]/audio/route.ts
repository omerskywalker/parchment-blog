import { NextResponse } from "next/server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  return NextResponse.json(
    { ok: false, slug, message: "audio narration endpoint — not yet implemented" },
    { status: 501 },
  );
}
