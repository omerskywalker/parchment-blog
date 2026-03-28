import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";
import { jsonError } from "@/lib/http";

function makeLimiter(requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window) });
}

// 5 registrations per IP per hour
export const registerLimiter = makeLimiter(5, "1 h");

// 3 forgot-password emails per IP per 15 minutes
export const forgotPasswordLimiter = makeLimiter(3, "15 m");

// 5 reset-password attempts per IP per 15 minutes
export const resetPasswordLimiter = makeLimiter(5, "15 m");

export async function getIp(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "anonymous"
  );
}

/**
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 * If the limiter is null (Redis not configured), always returns null.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<Response | null> {
  if (!limiter) return null;

  const { success, reset } = await limiter.limit(identifier);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return jsonError("RATE_LIMITED", 429, { retryAfter });
  }

  return null;
}
