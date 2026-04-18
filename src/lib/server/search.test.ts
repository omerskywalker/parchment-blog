import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Mock the Prisma client so tests never touch a real database.
 * `mockQueryRaw` is reset before each test and lets each case stub the rows
 * the SQL would have returned.
 */
const mockQueryRaw = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

// Real Prisma helpers are value-bearing but we don't need to introspect them
// in these tests — we just need the imports to resolve and the functions to
// return *something* the SQL template can consume.
vi.mock("@prisma/client", () => ({
  Prisma: {
    raw: (s: string) => ({ __raw: s }),
    sql: (strings: TemplateStringsArray, ...vals: unknown[]) => ({
      __sql: { strings, vals },
    }),
    join: (parts: unknown[], sep: string) => ({ __join: { parts, sep } }),
  },
}));

import { sanitizeSearchQuery, searchPosts, buildWordPatterns } from "./search";

describe("sanitizeSearchQuery", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeSearchQuery("")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeSearchQuery("  hello  ")).toBe("hello");
  });

  it("collapses internal whitespace", () => {
    expect(sanitizeSearchQuery("foo   bar")).toBe("foo bar");
  });

  it("strips tsquery operators: & | ! ( ) : * < > @", () => {
    expect(sanitizeSearchQuery("foo & bar")).toBe("foo bar");
    expect(sanitizeSearchQuery("!important")).toBe("important");
    expect(sanitizeSearchQuery("(hello world)")).toBe("hello world");
    expect(sanitizeSearchQuery("foo:*")).toBe("foo");
  });

  it("strips quotes", () => {
    expect(sanitizeSearchQuery("'single' \"double\"")).toBe("single double");
  });

  it("strips SQL LIKE wildcards (% and _) so they can't bypass the pattern", () => {
    expect(sanitizeSearchQuery("100%")).toBe("100");
    expect(sanitizeSearchQuery("foo_bar")).toBe("foo bar");
    expect(sanitizeSearchQuery("%%%")).toBe("");
  });

  it("returns empty string for all-operator input", () => {
    expect(sanitizeSearchQuery("& | ! :")).toBe("");
  });

  it("preserves dots, hyphens, and apostrophe-free word characters", () => {
    expect(sanitizeSearchQuery("next.js hooks")).toBe("next.js hooks");
    expect(sanitizeSearchQuery("self-care 101")).toBe("self-care 101");
  });

  it("preserves unicode characters (international content)", () => {
    expect(sanitizeSearchQuery("café münchen")).toBe("café münchen");
  });
});

describe("searchPosts — input handling", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it("returns [] without hitting the database for an empty query", async () => {
    expect(await searchPosts("")).toEqual([]);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("returns [] without hitting the database for a whitespace-only query", async () => {
    expect(await searchPosts("   \t  ")).toEqual([]);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("returns [] without hitting the database for an all-wildcards query (would otherwise match every post)", async () => {
    expect(await searchPosts("%%%___")).toEqual([]);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("queries the database for a non-empty sanitized query", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    await searchPosts("tiny roommate");
    expect(mockQueryRaw).toHaveBeenCalledOnce();
  });

  it("interpolates the full-phrase pattern as %query% into the ranking ORDER BY", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    await searchPosts("psychology");
    // The full-phrase pattern (used for rank boosting) is interpolated
    // directly into the outer template, so it appears as a top-level param.
    const params = mockQueryRaw.mock.calls[0]!.slice(1);
    expect(params).toContain("%psychology%");
  });
});

describe("buildWordPatterns — multi-word matching contract", () => {
  it("returns one pattern per whitespace-separated word", () => {
    expect(buildWordPatterns("tiny mate")).toEqual(["%tiny%", "%mate%"]);
  });

  it("collapses repeated whitespace and ignores empty tokens", () => {
    expect(buildWordPatterns("   foo    bar   ")).toEqual(["%foo%", "%bar%"]);
  });

  it("returns a single pattern for a single-word query", () => {
    expect(buildWordPatterns("claude")).toEqual(["%claude%"]);
  });

  it("returns an empty array for an empty input (no DB call would happen)", () => {
    expect(buildWordPatterns("")).toEqual([]);
  });

  it("treats short prefixes as valid words — 'cla' must produce a pattern", () => {
    // This is the regression that broke for users: 'cla' silently dropped
    // under tsquery stemming. With ILIKE %cla%, it must match 'claude'.
    expect(buildWordPatterns("cla")).toEqual(["%cla%"]);
  });

  it("supports CJK / unicode tokens as their own words", () => {
    expect(buildWordPatterns("café münchen")).toEqual(["%café%", "%münchen%"]);
  });
});

describe("searchPosts — result mapping", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  const baseRow = {
    id: "p1",
    title: "The Tiny Roommate",
    slug: "the-tiny-roommate",
    published_at: new Date("2026-04-16T12:00:00Z"),
    content_md: "This is the body. ".repeat(100),
    view_count: 20,
    tags: ["mental-health", "psychology"],
    author_name: "Omer",
    author_username: "omerskywalker",
  };

  it("maps DB rows to SearchPost shape with ISO date strings", async () => {
    mockQueryRaw.mockResolvedValueOnce([baseRow]);
    const [post] = await searchPosts("tiny");
    expect(post).toMatchObject({
      id: "p1",
      title: "The Tiny Roommate",
      slug: "the-tiny-roommate",
      publishedAt: "2026-04-16T12:00:00.000Z",
      tags: ["mental-health", "psychology"],
      authorName: "Omer",
      authorUsername: "omerskywalker",
    });
  });

  it("computes reading time at ~200 wpm with a minimum of 1 minute", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { ...baseRow, content_md: "" }, // empty body → still 1 min minimum
      { ...baseRow, content_md: "word ".repeat(200) }, // ~200 words → 1 min
      { ...baseRow, content_md: "word ".repeat(450) }, // ~450 words → 3 min
    ]);
    const posts = await searchPosts("tiny");
    expect(posts[0]!.readingTimeMin).toBe(1);
    expect(posts[1]!.readingTimeMin).toBe(1);
    expect(posts[2]!.readingTimeMin).toBe(3);
  });

  it("defaults view_count to 0 and tags to [] when DB returns null/undefined", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { ...baseRow, view_count: null as unknown as number, tags: null as unknown as string[] },
    ]);
    const [post] = await searchPosts("tiny");
    expect(post!.viewCount).toBe(0);
    expect(post!.tags).toEqual([]);
  });

  it("preserves null author fields (anonymous authors)", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { ...baseRow, author_name: null, author_username: null },
    ]);
    const [post] = await searchPosts("tiny");
    expect(post!.authorName).toBeNull();
    expect(post!.authorUsername).toBeNull();
  });

  it("returns rows in the order the DB provided them (preserves rank ordering)", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { ...baseRow, id: "first", slug: "a" },
      { ...baseRow, id: "second", slug: "b" },
      { ...baseRow, id: "third", slug: "c" },
    ]);
    const posts = await searchPosts("tiny");
    expect(posts.map((p) => p.id)).toEqual(["first", "second", "third"]);
  });
});

describe("searchPosts — limit clamping", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockQueryRaw.mockResolvedValue([]);
  });

  it("caps the limit at 50 even if a larger value is requested", async () => {
    await searchPosts("anything", 9999);
    // The LIMIT slot uses Prisma.raw(...) — our mock returns { __raw: '50' }.
    // Walk the param list to find the raw marker.
    const params = mockQueryRaw.mock.calls[0]!.slice(1);
    const rawLimit = params.find(
      (p): p is { __raw: string } => typeof p === "object" && p !== null && "__raw" in p,
    );
    expect(rawLimit?.__raw).toBe("50");
  });

  it("uses the requested limit when it's under 50", async () => {
    await searchPosts("anything", 5);
    const params = mockQueryRaw.mock.calls[0]!.slice(1);
    const rawLimit = params.find(
      (p): p is { __raw: string } => typeof p === "object" && p !== null && "__raw" in p,
    );
    expect(rawLimit?.__raw).toBe("5");
  });

  it("floors fractional limits and enforces a minimum of 1", async () => {
    await searchPosts("anything", 0);
    const params = mockQueryRaw.mock.calls[0]!.slice(1);
    const rawLimit = params.find(
      (p): p is { __raw: string } => typeof p === "object" && p !== null && "__raw" in p,
    );
    expect(rawLimit?.__raw).toBe("1");
  });
});
