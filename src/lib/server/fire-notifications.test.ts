import { describe, it, expect } from "vitest";
import { pendingMilestone, FIRE_MILESTONES } from "./fire-notifications";

describe("FIRE_MILESTONES", () => {
  it("contains 5, 25, and 100", () => {
    expect(FIRE_MILESTONES).toContain(5);
    expect(FIRE_MILESTONES).toContain(25);
    expect(FIRE_MILESTONES).toContain(100);
  });
});

describe("pendingMilestone", () => {
  it("returns null when fireCount is below all milestones", () => {
    expect(pendingMilestone(4, [])).toBeNull();
    expect(pendingMilestone(0, [])).toBeNull();
  });

  it("returns 5 when fireCount first reaches 5", () => {
    expect(pendingMilestone(5, [])).toBe(5);
    expect(pendingMilestone(6, [])).toBe(5);
  });

  it("returns 25 when fireCount first reaches 25", () => {
    expect(pendingMilestone(25, [5])).toBe(25);
    expect(pendingMilestone(30, [5])).toBe(25);
  });

  it("returns 100 when fireCount first reaches 100", () => {
    expect(pendingMilestone(100, [5, 25])).toBe(100);
  });

  it("returns null when all reached milestones are already sent", () => {
    expect(pendingMilestone(5, [5])).toBeNull();
    expect(pendingMilestone(25, [5, 25])).toBeNull();
    expect(pendingMilestone(100, [5, 25, 100])).toBeNull();
  });

  it("returns the highest pending milestone when multiple are crossed", () => {
    // e.g. someone jumps from 0 to 30 fires without intermediate notifications
    expect(pendingMilestone(30, [])).toBe(25);
    expect(pendingMilestone(100, [])).toBe(100);
    expect(pendingMilestone(100, [5])).toBe(100);
  });

  it("returns null for count well above max milestone when all sent", () => {
    expect(pendingMilestone(9999, [5, 25, 100])).toBeNull();
  });
});
