import { describe, expect, it } from "vitest";
import { isNarratable, markdownToNarrationText } from "./audioText";

describe("markdownToNarrationText", () => {
  it("preserves plain prose unchanged", () => {
    expect(markdownToNarrationText("Hello world. This is a sentence.")).toBe(
      "Hello world. This is a sentence.",
    );
  });

  it("drops fenced code blocks entirely", () => {
    const md = "Before.\n\n```ts\nconst x = 1;\n```\n\nAfter.";
    expect(markdownToNarrationText(md)).toBe("Before. After.");
  });

  it("drops inline code", () => {
    expect(markdownToNarrationText("Use the `foo` helper here.")).toBe(
      "Use the helper here.",
    );
  });

  it("drops image syntax", () => {
    const md = "Look at this:\n\n![alt text](/img.png)\n\nNice photo.";
    expect(markdownToNarrationText(md)).toBe("Look at this:. Nice photo.");
  });

  it("preserves link text but drops URLs", () => {
    expect(markdownToNarrationText("Visit [our site](https://x.com).")).toBe(
      "Visit our site.",
    );
  });

  it("strips emphasis markers", () => {
    expect(markdownToNarrationText("This is **bold** and *italic* text.")).toBe(
      "This is bold and italic text.",
    );
  });

  it("converts headings into spoken sentences with an ellipsis pause", () => {
    const md = "# Big idea\n\nFollowed by a paragraph.";
    // Trailing "…" gives the TTS engine a longer beat than a regular
    // sentence break — the spoken audio should pause noticeably
    // between the heading and the paragraph that follows.
    expect(markdownToNarrationText(md)).toBe("Big idea\u2026 Followed by a paragraph.");
  });

  it("strips heading question marks in favour of the ellipsis pause", () => {
    const md = "## Why does this matter?\n\nBecause it does.";
    expect(markdownToNarrationText(md)).toBe(
      "Why does this matter\u2026 Because it does.",
    );
  });

  it("does not stack a period after a heading's ellipsis", () => {
    const md = "### Section\n\nBody text here.";
    const out = markdownToNarrationText(md);
    // No "Section…." with a doubled punctuation cue.
    expect(out).not.toMatch(/\u2026\./);
    expect(out).toBe("Section\u2026 Body text here.");
  });

  it("flattens unordered and ordered lists into prose", () => {
    const md = "Reasons:\n\n- one\n- two\n- three";
    const out = markdownToNarrationText(md);
    expect(out).toContain("Reasons:");
    expect(out).toContain("one");
    expect(out).toContain("two");
    expect(out).toContain("three");
    // No bullet characters survive
    expect(out).not.toMatch(/[-*+]\s/);
  });

  it("strips blockquote markers but keeps the quoted text", () => {
    expect(markdownToNarrationText("> quoted line\n\nbody")).toBe(
      "quoted line. body",
    );
  });

  it("removes horizontal rules", () => {
    expect(markdownToNarrationText("Above.\n\n---\n\nBelow.")).toBe(
      "Above. Below.",
    );
  });

  it("collapses excess whitespace into single spaces", () => {
    expect(markdownToNarrationText("a    b\t\tc")).toBe("a b c");
  });
});

describe("isNarratable", () => {
  it("rejects short stubs under 80 characters", () => {
    expect(isNarratable("Just a tiny note.")).toBe(false);
  });

  it("accepts realistic-length content", () => {
    expect(
      isNarratable(
        "This is the kind of paragraph a writer might publish. It has enough words to merit narration.",
      ),
    ).toBe(true);
  });

  it("treats whitespace-only as non-narratable", () => {
    expect(isNarratable("   \n\n\t  ")).toBe(false);
  });
});
