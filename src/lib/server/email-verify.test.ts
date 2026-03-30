import { describe, it, expect } from "vitest";
import {
  makeVerifyToken,
  hashVerifyToken,
  VERIFY_TOKEN_TTL_MS,
} from "./email-verify";

describe("makeVerifyToken", () => {
  it("returns a 64-character hex string", () => {
    const token = makeVerifyToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different token on each call", () => {
    const a = makeVerifyToken();
    const b = makeVerifyToken();
    expect(a).not.toBe(b);
  });
});

describe("hashVerifyToken", () => {
  it("returns a 64-character hex SHA-256 hash", () => {
    const hash = hashVerifyToken("some-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    const h1 = hashVerifyToken("abc123");
    const h2 = hashVerifyToken("abc123");
    expect(h1).toBe(h2);
  });

  it("different inputs produce different hashes", () => {
    const h1 = hashVerifyToken("token-a");
    const h2 = hashVerifyToken("token-b");
    expect(h1).not.toBe(h2);
  });
});

describe("VERIFY_TOKEN_TTL_MS", () => {
  it("is 24 hours in milliseconds", () => {
    expect(VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
