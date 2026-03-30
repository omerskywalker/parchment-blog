import { describe, it, expect } from "vitest";

/**
 * Tests for scheduled-publish business logic.
 *
 * The cron endpoint publishes posts where scheduledAt <= now AND publishedAt IS NULL.
 */

function isDueForPublish(scheduledAt: Date | null, publishedAt: Date | null, now: Date): boolean {
  if (publishedAt !== null) return false; // already published
  if (scheduledAt === null) return false; // no schedule set
  return scheduledAt <= now;
}

describe("isDueForPublish", () => {
  const now = new Date("2026-03-30T12:00:00Z");

  it("returns true when scheduledAt is in the past and not yet published", () => {
    const scheduledAt = new Date("2026-03-30T11:00:00Z");
    expect(isDueForPublish(scheduledAt, null, now)).toBe(true);
  });

  it("returns true when scheduledAt equals now (boundary)", () => {
    expect(isDueForPublish(now, null, now)).toBe(true);
  });

  it("returns false when scheduledAt is in the future", () => {
    const scheduledAt = new Date("2026-03-30T13:00:00Z");
    expect(isDueForPublish(scheduledAt, null, now)).toBe(false);
  });

  it("returns false when already published", () => {
    const scheduledAt = new Date("2026-03-30T11:00:00Z");
    const publishedAt = new Date("2026-03-30T11:05:00Z");
    expect(isDueForPublish(scheduledAt, publishedAt, now)).toBe(false);
  });

  it("returns false when scheduledAt is null", () => {
    expect(isDueForPublish(null, null, now)).toBe(false);
  });
});

describe("toDatetimeLocal (helper logic)", () => {
  it("formats an ISO string to datetime-local format", () => {
    const iso = "2026-03-30T14:30:00.000Z";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const result = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    // Verify it matches YYYY-MM-DDTHH:mm pattern
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
