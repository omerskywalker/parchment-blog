import { describe, expect, it } from "vitest";
import { formatScheduledPublishDate } from "./schedule";

describe("formatScheduledPublishDate", () => {
  it("returns UTC-only and local-friendly schedule strings", () => {
    const formatted = formatScheduledPublishDate("2026-04-20T09:00:00.000Z");

    expect(formatted.utcDate).toBeTruthy();
    expect(formatted.utcDateTime).toContain("UTC");
    expect(formatted.localDateTime).toMatch(/\d{2}, \d{4}/);
  });
});
