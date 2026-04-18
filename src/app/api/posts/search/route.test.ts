import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchPosts = vi.fn();
vi.mock("@/lib/server/search", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/search")>(
    "@/lib/server/search",
  );
  return {
    ...actual,
    searchPosts: (...args: unknown[]) => mockSearchPosts(...args),
  };
});

import { GET } from "./route";

function makeReq(q: string | null): Parameters<typeof GET>[0] {
  const url = new URL("http://localhost/api/posts/search");
  if (q !== null) url.searchParams.set("q", q);
  return { nextUrl: url } as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/posts/search", () => {
  beforeEach(() => {
    mockSearchPosts.mockReset();
  });

  it("returns ok:true with empty posts when no q param is provided", async () => {
    const res = await GET(makeReq(null));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, posts: [] });
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("returns ok:true with empty posts when q is whitespace only (sanitized to empty)", async () => {
    const res = await GET(makeReq("    "));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, posts: [] });
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("returns 400 for queries longer than 200 characters", async () => {
    const tooLong = "a".repeat(201);
    const res = await GET(makeReq(tooLong));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it("invokes searchPosts with the sanitized query and returns its results", async () => {
    mockSearchPosts.mockResolvedValueOnce([
      { id: "p1", title: "Hello", slug: "hello" },
    ]);
    const res = await GET(makeReq("  hello  "));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.posts).toHaveLength(1);
    expect(mockSearchPosts).toHaveBeenCalledWith("hello");
  });

  it("returns 500 with ok:false when the underlying search throws", async () => {
    mockSearchPosts.mockRejectedValueOnce(new Error("db down"));
    const res = await GET(makeReq("anything"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("does not leak internal error details to the client (generic message only)", async () => {
    mockSearchPosts.mockRejectedValueOnce(
      new Error("PrismaClientKnownRequestError: P2024 connection pool timeout"),
    );
    const res = await GET(makeReq("anything"));
    const body = await res.json();
    expect(body.error).not.toContain("Prisma");
    expect(body.error).not.toContain("P2024");
  });
});
