import { describe, it, expect } from "vitest";
import { slugify } from "./posts";

describe("slugify", () => {
  it("lowercases input", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  foo  ")).toBe("foo");
  });

  it("collapses multiple non-alphanumeric chars into one hyphen", () => {
    expect(slugify("foo & bar")).toBe("foo-bar");
  });

  it("strips single and double quotes", () => {
    expect(slugify("it's a test")).toBe("its-a-test");
  });

  it("handles numbers", () => {
    expect(slugify("post 42")).toBe("post-42");
  });

  it("returns empty string for all-special chars", () => {
    expect(slugify("!!!")).toBe("");
  });
});
