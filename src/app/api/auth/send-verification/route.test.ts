import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getIp: vi.fn(),
  checkRateLimit: vi.fn(),
  getResend: vi.fn(),
  appUrl: vi.fn(),
  fromEmail: vi.fn(),
  makeVerifyToken: vi.fn(),
  hashVerifyToken: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getIp: mocks.getIp,
  checkRateLimit: mocks.checkRateLimit,
  forgotPasswordLimiter: Symbol("forgotPasswordLimiter"),
}));

vi.mock("@/lib/email/resend", () => ({
  getResend: mocks.getResend,
  appUrl: mocks.appUrl,
  fromEmail: mocks.fromEmail,
}));

vi.mock("@/lib/server/email-verify", () => ({
  makeVerifyToken: mocks.makeVerifyToken,
  hashVerifyToken: mocks.hashVerifyToken,
  VERIFY_TOKEN_TTL_MS: 24 * 60 * 60 * 1000,
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

import { POST } from "./route";

describe("POST /api/auth/send-verification", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();

    mocks.getIp.mockResolvedValue("127.0.0.1");
    mocks.checkRateLimit.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue({ user: { email: "writer@example.com" } });
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "writer@example.com",
      emailVerified: null,
    });
    mocks.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.verificationToken.create.mockResolvedValue({});
    mocks.makeVerifyToken.mockReturnValue("raw-verify-token");
    mocks.hashVerifyToken.mockReturnValue("hashed-verify-token");
    mocks.appUrl.mockReturnValue("https://parchment.blog");
    mocks.fromEmail.mockReturnValue("Parchment <no-reply@parchment.blog>");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("emails the API verification endpoint", async () => {
    const send = vi.fn().mockResolvedValue({});
    mocks.getResend.mockReturnValue({ emails: { send } });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "writer@example.com",
        html: expect.stringContaining(
          "https://parchment.blog/api/auth/verify-email?token=raw-verify-token",
        ),
      }),
    );
  });
});
