import { describe, expect, it } from "vitest";
import { formatAutoSaveStatus } from "./editorStatus";

describe("formatAutoSaveStatus", () => {
  it("returns a saving label while autosave is in progress", () => {
    expect(formatAutoSaveStatus("saving", null)).toBe("Saving draft…");
  });

  it("returns a helpful error label when autosave fails", () => {
    expect(formatAutoSaveStatus("error", null)).toBe(
      "Autosave failed. Your latest changes are still unsaved.",
    );
  });

  it("includes the last saved time when autosave succeeded", () => {
    const status = formatAutoSaveStatus("saved", new Date("2026-04-12T14:37:00.000Z"));

    expect(status).toMatch(/^Draft saved at /);
  });

  it("returns null when there is no status to show", () => {
    expect(formatAutoSaveStatus("idle", null)).toBeNull();
  });
});
