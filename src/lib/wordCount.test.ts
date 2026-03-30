import { describe, it, expect } from "vitest";
import { wordCount } from "./wordCount";

describe("wordCount", () => {
  it("returns 0 for empty string", () => {
    expect(wordCount("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(wordCount("   ")).toBe(0);
  });

  it("counts single word", () => {
    expect(wordCount("hello")).toBe(1);
  });

  it("counts multiple words", () => {
    expect(wordCount("hello world foo")).toBe(3);
  });

  it("handles extra internal whitespace", () => {
    expect(wordCount("hello   world")).toBe(2);
  });

  it("handles leading and trailing whitespace", () => {
    expect(wordCount("  hello world  ")).toBe(2);
  });

  it("handles newlines and tabs", () => {
    expect(wordCount("one\ntwo\tthree")).toBe(3);
  });
});
