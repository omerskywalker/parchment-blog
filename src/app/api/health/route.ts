import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  return NextResponse.json({ ok: true, result });
}
