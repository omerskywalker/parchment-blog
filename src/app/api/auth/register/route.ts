import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { RegisterSchema } from "@/lib/validators/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@/lib/server/error-codes";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonError(ERROR_CODES.INVALID_JSON, 400);
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(ERROR_CODES.VALIDATION_ERROR, 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, email, password } = parsed.data;

  const normalizedEmail = email.toLowerCase().trim();

  // hash password (cost factor 10)
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
      },
    });

    return jsonOk({}, 201);
  } catch (err) {
    // prisma unique constraint violation
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("EMAIL_IN_USE", 409);
    }

    console.error(err);
    return jsonError(ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
