import { describe, it, expect } from "vitest";
import { extractExcerpt } from "./excerpt";

describe("extractExcerpt", () => {
  it("returns empty string for empty input", () => {
    expect(extractExcerpt("")).toBe("");
  });

  it("strips leading h1/h2/h3 headings and uses the first real paragraph", () => {
    const md = "# Title\n\n## Subtitle\n\nThe actual first paragraph of the post.";
    expect(extractExcerpt(md)).toBe("The actual first paragraph of the post.");
  });

  it("strips inline markdown (bold, italic, code, links)", () => {
    const md = "Read **this** *amazing* post about `arrays` and [linking](https://x.com).";
    expect(extractExcerpt(md)).toBe("Read this amazing post about and linking.");
  });

  it("removes images entirely (alt text included)", () => {
    const md = "![cover image](cover.png)\n\nWe explore tradeoffs in distributed systems.";
    expect(extractExcerpt(md)).toBe("We explore tradeoffs in distributed systems.");
  });

  it("skips fenced code blocks when finding the excerpt", () => {
    const md = "```ts\nconst x = 1;\n```\n\nHere is the prose that should win.";
    expect(extractExcerpt(md)).toBe("Here is the prose that should win.");
  });

  it("truncates at maxLen with an ellipsis", () => {
    const md = "x".repeat(300);
    const out = extractExcerpt(md, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
  });

  it("ignores blocks under 20 chars and uses the next substantial one", () => {
    const md = "Hi.\n\nThis is the first real paragraph with substance.";
    expect(extractExcerpt(md)).toBe("This is the first real paragraph with substance.");
  });

  it("falls back to empty string when no substantial block exists", () => {
    expect(extractExcerpt("# tiny\n\n## also tiny")).toBe("");
  });

  it("handles blockquotes by stripping the quote marker", () => {
    const md = "> A quote about something interesting that is long enough to qualify.";
    expect(extractExcerpt(md)).toBe(
      "A quote about something interesting that is long enough to qualify.",
    );
  });
});
