import { describe, it, expect } from "vitest";
import { sanitizeSearchQuery } from "./search";

describe("sanitizeSearchQuery", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeSearchQuery("")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeSearchQuery("  hello  ")).toBe("hello");
  });

  it("collapses internal whitespace", () => {
    expect(sanitizeSearchQuery("foo   bar")).toBe("foo bar");
  });

  it("strips tsquery operators: & | ! ( ) : * < > @", () => {
    expect(sanitizeSearchQuery("foo & bar")).toBe("foo   bar");
    expect(sanitizeSearchQuery("!important")).toBe(" important");
    expect(sanitizeSearchQuery("(hello world)")).toBe(" hello world ");
    expect(sanitizeSearchQuery("foo:*")).toBe("foo ");
  });

  it("strips quotes", () => {
    expect(sanitizeSearchQuery("'single' \"double\"")).toBe(" single   double ");
  });

  it("returns empty string for all-operator input", () => {
    expect(sanitizeSearchQuery("& | ! :")).toBe("");
  });

  it("leaves normal alphanumeric queries unchanged", () => {
    expect(sanitizeSearchQuery("next.js hooks")).toBe("next.js hooks");
  });
});
