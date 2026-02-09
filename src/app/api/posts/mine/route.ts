import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/server/error-codes";


function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json({ ok: false as const, error, message }, { status });
}

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email;

  if (!email) {
    return jsonError(401, ERROR_CODES.UNAUTHORIZED, "You must be signed in.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return jsonError(401, ERROR_CODES.UNAUTHORIZED, "Account not found. Please sign in again.");
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  return NextResponse.json({ ok: true as const, posts });
}
