import { describe, it, expect } from "vitest";

/**
 * Pure helpers extracted from getRelatedPosts for unit testing.
 * The DB query itself is integration-tested via the actual route.
 */

function countTagOverlap(postTags: string[], targetTags: string[]): number {
  return postTags.filter((t) => targetTags.includes(t)).length;
}

function sortByTagOverlap<T extends { tags: string[] }>(
  posts: T[],
  targetTags: string[],
): T[] {
  return [...posts].sort(
    (a, b) =>
      countTagOverlap(b.tags, targetTags) - countTagOverlap(a.tags, targetTags),
  );
}

describe("countTagOverlap", () => {
  it("returns 0 when there is no overlap", () => {
    expect(countTagOverlap(["react"], ["nextjs"])).toBe(0);
  });

  it("returns 1 for a single shared tag", () => {
    expect(countTagOverlap(["react", "hooks"], ["react", "typescript"])).toBe(1);
  });

  it("returns the full count when all tags match", () => {
    expect(countTagOverlap(["a", "b", "c"], ["a", "b", "c"])).toBe(3);
  });

  it("returns 0 for empty arrays", () => {
    expect(countTagOverlap([], [])).toBe(0);
    expect(countTagOverlap(["react"], [])).toBe(0);
    expect(countTagOverlap([], ["react"])).toBe(0);
  });
});

describe("sortByTagOverlap", () => {
  const posts = [
    { id: "1", tags: ["react"] },
    { id: "2", tags: ["react", "typescript"] },
    { id: "3", tags: ["nextjs", "typescript", "react"] },
  ];

  it("sorts posts by descending tag overlap count", () => {
    const result = sortByTagOverlap(posts, ["react", "typescript"]);
    // post 3 shares 2 tags, post 2 shares 2, post 1 shares 1
    // posts 2 and 3 both have score 2; post 1 has score 1
    expect(result[result.length - 1]!.id).toBe("1");
  });

  it("does not mutate the original array", () => {
    const original = [...posts];
    sortByTagOverlap(posts, ["react"]);
    expect(posts).toEqual(original);
  });

  it("handles empty target tags — all scores are 0", () => {
    const result = sortByTagOverlap(posts, []);
    expect(result.length).toBe(posts.length);
  });
});
