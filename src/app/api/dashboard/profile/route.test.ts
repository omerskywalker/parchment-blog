import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

import { PATCH } from "./route";

describe("PATCH /api/dashboard/profile", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();

    mocks.getSession.mockResolvedValue({ user: { email: "writer@example.com" } });
    mocks.prisma.user.update.mockResolvedValue({
      email: "writer@example.com",
      name: "Writer",
      username: "writer-has-hyphen",
      bio: "Bio",
      avatarKey: null,
      autoPublish: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accepts hyphenated usernames so existing accounts can save profile changes", async () => {
    const request = new Request("http://localhost/api/dashboard/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "writer-has-hyphen",
        bio: "A short bio",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { email: "writer@example.com" },
      data: {
        username: "writer-has-hyphen",
        bio: "A short bio",
      },
      select: {
        email: true,
        name: true,
        username: true,
        bio: true,
        avatarKey: true,
        autoPublish: true,
      },
    });
  });
});
