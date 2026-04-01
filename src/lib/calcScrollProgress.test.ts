import { describe, it, expect } from "vitest";
import { calcScrollProgress } from "./calcScrollProgress";

describe("calcScrollProgress", () => {
  it("returns 0 when at the top", () => {
    expect(calcScrollProgress(0, 1000)).toBe(0);
  });

  it("returns 100 when fully scrolled", () => {
    expect(calcScrollProgress(1000, 1000)).toBe(100);
  });

  it("returns 50 at the midpoint", () => {
    expect(calcScrollProgress(500, 1000)).toBe(50);
  });

  it("clamps to 100 if scrolled past total", () => {
    expect(calcScrollProgress(1200, 1000)).toBe(100);
  });

  it("clamps to 0 for negative scroll", () => {
    expect(calcScrollProgress(-10, 1000)).toBe(0);
  });

  it("returns 0 when total is 0 (no scrollable content)", () => {
    expect(calcScrollProgress(0, 0)).toBe(0);
  });

  it("returns 0 when total is negative", () => {
    expect(calcScrollProgress(100, -50)).toBe(0);
  });
});
