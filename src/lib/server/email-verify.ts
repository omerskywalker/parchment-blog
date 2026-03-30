import crypto from "crypto";

/** Generate a secure random 32-byte hex token. */
export function makeVerifyToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** SHA-256 hash a raw token before DB storage. */
export function hashVerifyToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Token valid for 24 hours. */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
