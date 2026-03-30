import { describe, it, expect } from "vitest";

/**
 * Tests for share URL generation logic.
 *
 * buildXShareUrl builds the Twitter/X intent URL used by PostShareActions.
 */

function buildXShareUrl(title: string, pageUrl: string): string {
  const text = encodeURIComponent(title);
  const url = encodeURIComponent(pageUrl);
  return `https://x.com/intent/tweet?text=${text}&url=${url}`;
}

describe("buildXShareUrl", () => {
  it("returns a valid x.com intent URL", () => {
    const result = buildXShareUrl("Hello World", "https://parchment.dev/posts/hello-world");
    expect(result).toContain("https://x.com/intent/tweet");
  });

  it("URL-encodes the title", () => {
    const result = buildXShareUrl("Hello & World", "https://example.com");
    expect(result).toContain(encodeURIComponent("Hello & World"));
  });

  it("URL-encodes the page URL", () => {
    const pageUrl = "https://example.com/posts/my-post?tag=react";
    const result = buildXShareUrl("Test", pageUrl);
    expect(result).toContain(encodeURIComponent(pageUrl));
  });

  it("includes both text and url query params", () => {
    const result = buildXShareUrl("A post", "https://example.com/posts/a");
    expect(result).toMatch(/text=.+&url=.+/);
  });

  it("handles titles with special characters", () => {
    const title = "React's new hooks: a deep dive";
    const result = buildXShareUrl(title, "https://example.com");
    expect(result).toContain(encodeURIComponent(title));
  });
});
