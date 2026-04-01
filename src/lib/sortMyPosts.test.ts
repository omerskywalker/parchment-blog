import { describe, it, expect } from "vitest";
import { sortMyPosts } from "./sortMyPosts";

const posts = [
  { id: "a", updatedAt: "2026-01-01T00:00:00Z", viewCount: 10, fireCount: 5 },
  { id: "b", updatedAt: "2026-03-01T00:00:00Z", viewCount: 50, fireCount: 2 },
  { id: "c", updatedAt: "2026-02-01T00:00:00Z", viewCount: 20, fireCount: 9 },
];

describe("sortMyPosts", () => {
  it("sorts by date (updatedAt desc) by default", () => {
    const result = sortMyPosts(posts, "date");
    expect(result.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by views descending", () => {
    const result = sortMyPosts(posts, "views");
    expect(result.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by fires descending", () => {
    const result = sortMyPosts(posts, "fires");
    expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input array", () => {
    const original = [...posts];
    sortMyPosts(posts, "views");
    expect(posts).toEqual(original);
  });

  it("handles empty array", () => {
    expect(sortMyPosts([], "date")).toEqual([]);
  });

  it("handles single item", () => {
    const result = sortMyPosts([posts[0]], "fires");
    expect(result).toHaveLength(1);
  });
});
