import { describe, it, expect } from "vitest";
import { extractHeadings, slugify } from "./headings";

describe("slugify — TOC anchor contract", () => {
  it("lowercases and hyphenates simple text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips apostrophes and punctuation, collapses whitespace and hyphens", () => {
    expect(slugify("What's New?  Big   Updates!")).toBe("whats-new-big-updates");
  });

  it("trims leading and trailing hyphens left over from punctuation removal", () => {
    expect(slugify("--Title--")).toBe("title");
  });

  it("returns empty string for purely-symbolic input (caller must handle)", () => {
    // Edge case worth pinning: a heading like "###" would slugify to "".
    // The TOC won't render it because extractHeadings requires text after #s,
    // but if a renderer ever stamped an empty id it would silently break links.
    expect(slugify("!!!")).toBe("");
  });

  it("must produce identical ids for the same input as extractHeadings", () => {
    // This is the contract: TOC links say `#${slugify(text)}`, rendered headings
    // get id={slugify(childrenText)}. If they ever diverge, anchors break.
    const text = "Building Interoceptive Awareness";
    const fromExtractor = extractHeadings(`## ${text}`)[0]!.id;
    const fromSlug = slugify(text);
    expect(fromExtractor).toBe(fromSlug);
  });
});

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
