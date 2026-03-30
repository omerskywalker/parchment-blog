import { describe, it, expect } from "vitest";
import { qk } from "./queryKeys";

describe("queryKeys", () => {
  describe("myPosts", () => {
    it("returns stable key", () => {
      expect(qk.myPosts()).toEqual(["my-posts"]);
    });
  });

  describe("post", () => {
    it("includes id in key", () => {
      expect(qk.post("abc123")).toEqual(["post", "abc123"]);
    });
  });

  describe("publicFeed", () => {
    it("produces expected key shape for home scope", () => {
      const key = qk.publicFeed({ scope: "home" });
      expect(key[0]).toBe("public-posts-cursor");
      expect(key[1]).toBe("home");
    });

    it("includes tag in key when provided", () => {
      const key = qk.publicFeed({ scope: "posts", tag: "react" });
      expect(key[2]).toMatchObject({ tag: "react" });
    });

    it("normalizes absent tag to null", () => {
      const key = qk.publicFeed({ scope: "posts" });
      expect(key[2]).toMatchObject({ tag: null });
    });
  });

  describe("publicPost", () => {
    it("includes slug in key", () => {
      expect(qk.publicPost("my-post")).toEqual(["public-post", "my-post"]);
    });
  });

  describe("profile", () => {
    it("includes username in key", () => {
      expect(qk.profile("omer")).toEqual(["profile", "omer"]);
    });
  });

  describe("postStats", () => {
    it("includes slug in key", () => {
      expect(qk.postStats("my-post")).toEqual(["post-stats", "my-post"]);
    });
  });
});
