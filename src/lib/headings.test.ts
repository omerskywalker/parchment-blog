import { describe, it, expect } from "vitest";
import { extractHeadings } from "./headings";

describe("extractHeadings", () => {
  it("returns an empty array for markdown with no headings", () => {
    expect(extractHeadings("Just a paragraph.\n\nAnother one.")).toEqual([]);
  });

  it("extracts h2 and h3 headings with GitHub-style anchor IDs", () => {
    const md = "## First Section\n\nbody\n\n### Sub Heading\n\nmore";
    expect(extractHeadings(md)).toEqual([
      { id: "first-section", text: "First Section", level: 2 },
      { id: "sub-heading", text: "Sub Heading", level: 3 },
    ]);
  });

  it("ignores h1 (page title) and h4+ (too granular for a TOC)", () => {
    const md = "# Title\n\n## Real\n\n#### Too deep";
    expect(extractHeadings(md)).toEqual([
      { id: "real", text: "Real", level: 2 },
    ]);
  });

  it("strips inline markdown from heading text", () => {
    const md = "## **Bold** and _italic_ and `code` and [link](https://x.com)";
    expect(extractHeadings(md)).toEqual([
      { id: "bold-and-italic-and-code-and-link", text: "Bold and italic and code and link", level: 2 },
    ]);
  });

  it("ignores heading-like lines inside fenced code blocks", () => {
    const md = "## Real heading\n\n```md\n## Not a heading\n```\n\n### Another real one";
    expect(extractHeadings(md)).toEqual([
      { id: "real-heading", text: "Real heading", level: 2 },
      { id: "another-real-one", text: "Another real one", level: 3 },
    ]);
  });

  it("slugifies punctuation and collapses whitespace", () => {
    const md = "## What's New?  Big   Updates!";
    expect(extractHeadings(md)).toEqual([
      { id: "whats-new-big-updates", text: "What's New?  Big   Updates!", level: 2 },
    ]);
  });
});
