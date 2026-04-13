import { describe, expect, it } from "vitest";
import { hasNewPostDraftContent } from "./drafts";

describe("hasNewPostDraftContent", () => {
  it("returns false for an empty draft", () => {
    expect(
      hasNewPostDraftContent({
        title: "",
        contentMd: "",
        slug: "",
        tags: [],
      }),
    ).toBe(false);
  });

  it("returns true when text content exists", () => {
    expect(
      hasNewPostDraftContent({
        title: "Draft title",
        contentMd: "",
        slug: "",
        tags: [],
      }),
    ).toBe(true);
  });

  it("returns true when tags exist even if text fields are empty", () => {
    expect(
      hasNewPostDraftContent({
        title: "",
        contentMd: "",
        slug: "",
        tags: ["writing"],
      }),
    ).toBe(true);
  });
});
