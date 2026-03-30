import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { RegisterSchema } from "@/lib/validators/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@/lib/server/error-codes";
import { checkRateLimit, getIp, registerLimiter } from "@/lib/server/rate-limit";
import { getResend, appUrl, fromEmail } from "@/lib/email/resend";
import { makeVerifyToken, hashVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/server/email-verify";

function normalizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 30);
}

function prettyNameFromUsername(u: string) {
  // hasan_khan -> hasan khan, hasan-khan -> hasan khan
  const words = u.replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean);

  const titled = words.map((w) => w.charAt(0).toLowerCase() + w.slice(1));
  return titled.join(" ").slice(0, 60);
}

async function ensureUniqueUsername(base: string) {
  const cleaned = normalizeUsername(base);
  const seed = cleaned.length >= 3 ? cleaned : "user";

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? seed : `${seed}_${i + 1}`.slice(0, 30);
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `${seed}_${crypto.randomUUID().slice(0, 6)}`.slice(0, 30);
}

export async function POST(req: Request) {
  const ip = await getIp();
  const limited = await checkRateLimit(registerLimiter, ip);
  if (limited) return limited;

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

  const { email, password, username } = parsed.data;

  const normalizedEmail = email.toLowerCase().trim();

  // normalize + uniquify username
  const uniqueUsername = await ensureUniqueUsername(username);

  // auto name from username
  const name = prettyNameFromUsername(uniqueUsername);

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        username: uniqueUsername,
        name,
      },
    });

    // Send email verification (best-effort — never block registration)
    void sendVerificationEmail(normalizedEmail);

    return jsonOk({}, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // could be email or username
      return jsonError("CONFLICT", 409);
    }

    console.error(err);
    return jsonError(ERROR_CODES.INTERNAL_ERROR, 500);
  }
}

async function sendVerificationEmail(email: string) {
  try {
    const rawToken = makeVerifyToken();
    const tokenHash = hashVerifyToken(rawToken);
    const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    // Remove any stale tokens for this address before creating a new one
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await prisma.verificationToken.create({
      data: { identifier: email, token: tokenHash, expires },
    });

    const url = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    const resend = getResend();

    if (!resend) {
      console.warn("[register] RESEND_API_KEY missing. Verify link (dev only):", url);
      return;
    }

    await resend.emails.send({
      from: fromEmail(),
      to: email,
      subject: "Verify your Parchment email",
      html: `
        <p>Welcome to Parchment!</p>
        <p><a href="${url}">Click here to verify your email address</a> (valid for 24 hours).</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });
  } catch (err) {
    // Never let email failure affect registration
    console.error("[register] Failed to send verification email:", err);
  }
}
