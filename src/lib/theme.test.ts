import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_DOM_ATTRIBUTE,
  normalizeTheme,
  nextTheme,
  readStoredTheme,
  applyTheme,
  getThemeBootScript,
} from "./theme";

/**
 * The project runs vitest in the "node" environment (no jsdom). We stub the
 * tiny surface of `window`, `document`, and `localStorage` that theme.ts
 * actually uses. Cheaper than pulling in jsdom for one module.
 */

function makeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => void data.clear(),
  };
}

function makeDocument() {
  const attrs = new Map<string, string>();
  return {
    documentElement: {
      setAttribute: (name: string, value: string) => void attrs.set(name, value),
      getAttribute: (name: string) => attrs.get(name) ?? null,
      removeAttribute: (name: string) => void attrs.delete(name),
    },
  };
}

type FakeStorage = ReturnType<typeof makeStorage>;
type FakeDocument = ReturnType<typeof makeDocument>;
type FakeWindow = { localStorage: FakeStorage };

let win: FakeWindow;
let doc: FakeDocument;

beforeEach(() => {
  win = { localStorage: makeStorage() };
  doc = makeDocument();
  (globalThis as { window: unknown }).window = win;
  (globalThis as { document: unknown }).document = doc;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
});

describe("THEMES contract", () => {
  it("only allows the two declared theme values", () => {
    expect(THEMES).toEqual(["dark", "sepia"]);
  });

  it("defaults to dark — new visitors keep the existing experience", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });
});

describe("normalizeTheme", () => {
  it("passes valid themes through unchanged", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("sepia")).toBe("sepia");
  });

  it("falls back to the default for unknown values", () => {
    expect(normalizeTheme("solarized")).toBe("dark");
    expect(normalizeTheme(null)).toBe("dark");
    expect(normalizeTheme(undefined)).toBe("dark");
    expect(normalizeTheme(42)).toBe("dark");
  });
});

describe("nextTheme — toggle behaviour", () => {
  it("flips dark → sepia", () => {
    expect(nextTheme("dark")).toBe("sepia");
  });

  it("flips sepia → dark", () => {
    expect(nextTheme("sepia")).toBe("dark");
  });
});

describe("readStoredTheme", () => {
  it("returns default when nothing is stored", () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("returns the stored value when valid", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readStoredTheme()).toBe("sepia");
  });

  it("returns default when stored value is corrupted", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "garbage");
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("returns default when localStorage access throws (private mode)", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    };
    (globalThis as unknown as { window: { localStorage: typeof throwingStorage } }).window.localStorage =
      throwingStorage;
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });
});

describe("applyTheme", () => {
  it("sets the data-theme attribute on <html>", () => {
    applyTheme("sepia");
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("persists the chosen theme to localStorage", () => {
    applyTheme("sepia");
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe("sepia");
  });

  it("normalizes invalid input before applying — never stamps garbage", () => {
    applyTheme("nonsense" as never);
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe(DEFAULT_THEME);
  });

  it("returns the theme it actually applied (handy for state sync)", () => {
    expect(applyTheme("sepia")).toBe("sepia");
    expect(applyTheme("dark")).toBe("dark");
  });
});

describe("getThemeBootScript — FOUC prevention contract", () => {
  it("includes the storage key, dom attribute, and both theme values", () => {
    const src = getThemeBootScript();
    expect(src).toContain(THEME_STORAGE_KEY);
    expect(src).toContain(THEME_DOM_ATTRIBUTE);
    expect(src).toContain('"dark"');
    expect(src).toContain('"sepia"');
  });

  it("is wrapped in an IIFE so it doesn't leak globals", () => {
    expect(getThemeBootScript()).toMatch(/^\(function\(\)\{/);
  });

  it("is wrapped in try/catch — must never throw and break the page", () => {
    expect(getThemeBootScript()).toContain("try{");
    expect(getThemeBootScript()).toContain("catch(e)");
  });

  it("when executed, applies a previously-stored sepia preference to <html>", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    new Function("window", "document", "localStorage", getThemeBootScript())(
      win,
      doc,
      win.localStorage,
    );
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("when executed with no stored preference, applies the default theme", () => {
    new Function("window", "document", "localStorage", getThemeBootScript())(
      win,
      doc,
      win.localStorage,
    );
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
  });

  it("when executed with corrupted storage, applies the default theme", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "💥");
    new Function("window", "document", "localStorage", getThemeBootScript())(
      win,
      doc,
      win.localStorage,
    );
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
  });
});
