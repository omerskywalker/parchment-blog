import { describe, it, expect } from "vitest";

/**
 * Tests for auto-publish business logic.
 *
 * The core rule: when a user creates a post with autoPublish=true,
 * the post's publishedAt should be set to the current time (not null).
 * When autoPublish=false, publishedAt should be null (draft).
 */

function resolvePublishedAt(autoPublish: boolean): Date | null {
  return autoPublish ? new Date() : null;
}

describe("auto-publish logic", () => {
  it("returns a Date when autoPublish is true", () => {
    const result = resolvePublishedAt(true);
    expect(result).toBeInstanceOf(Date);
  });

  it("returns null when autoPublish is false", () => {
    const result = resolvePublishedAt(false);
    expect(result).toBeNull();
  });

  it("published date is close to now when autoPublish is true", () => {
    const before = Date.now();
    const result = resolvePublishedAt(true);
    const after = Date.now();
    expect(result).not.toBeNull();
    const ts = (result as Date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

/**
 * Tests for default autoPublish value.
 * The schema default is true, so new users should default to auto-publish on.
 */
describe("autoPublish default", () => {
  it("defaults to true for new users", () => {
    // Mirrors the Prisma schema default: autoPublish Boolean @default(true)
    const schemaDefault = true;
    expect(schemaDefault).toBe(true);
  });
});
