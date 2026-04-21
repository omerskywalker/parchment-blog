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

/**
 * A document stub that supports cookie read/write the way the browser
 * does: `document.cookie = "k=v; path=/"` appends/updates a single
 * key, and `document.cookie` getter returns the joined "k=v; k2=v2"
 * string. This is what theme.ts's reader and writer interact with.
 */
function makeDocument(opts: { protocol?: string } = {}) {
  const attrs = new Map<string, string>();
  const cookies = new Map<string, string>();
  // Capture cookie attribute strings (path/max-age/SameSite/Secure) so
  // tests can assert on them. Last write wins, mirroring browsers.
  const cookieMeta = new Map<string, string>();

  const doc = {
    documentElement: {
      setAttribute: (name: string, value: string) => void attrs.set(name, value),
      getAttribute: (name: string) => attrs.get(name) ?? null,
      removeAttribute: (name: string) => void attrs.delete(name),
    },
    get cookie(): string {
      return Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
    set cookie(raw: string) {
      // Parse "key=value; path=/; SameSite=Lax; Secure"
      const [pair, ...attrParts] = raw.split(";").map((s) => s.trim());
      const eq = pair.indexOf("=");
      if (eq === -1) return;
      const k = pair.slice(0, eq);
      const v = pair.slice(eq + 1);
      cookies.set(k, v);
      cookieMeta.set(k, attrParts.join("; "));
    },
    _cookieMetaFor: (k: string) => cookieMeta.get(k) ?? "",
  };
  // Expose protocol for Secure-flag tests via window.location.protocol.
  (doc as unknown as { _protocol: string })._protocol = opts.protocol ?? "https:";
  return doc;
}

type FakeStorage = ReturnType<typeof makeStorage>;
type FakeDocument = ReturnType<typeof makeDocument>;
type FakeWindow = {
  localStorage: FakeStorage;
  location: { protocol: string };
};

let win: FakeWindow;
let doc: FakeDocument;

beforeEach(() => {
  doc = makeDocument({ protocol: "https:" });
  win = {
    localStorage: makeStorage(),
    location: { protocol: (doc as unknown as { _protocol: string })._protocol },
  };
  (globalThis as { window: unknown }).window = win;
  (globalThis as { document: unknown }).document = doc;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
});

/* ------------------------------------------------------------------ */
/*  Constants & pure helpers                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  readStoredTheme — cookie-first, localStorage-fallback             */
/* ------------------------------------------------------------------ */

describe("readStoredTheme", () => {
  it("returns default when nothing is stored anywhere", () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("returns the cookie value when present", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    expect(readStoredTheme()).toBe("sepia");
  });

  it("prefers cookie over localStorage when both are set", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    win.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readStoredTheme()).toBe("sepia");
  });

  it("falls back to localStorage when cookie is absent", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readStoredTheme()).toBe("sepia");
  });

  it("returns default when localStorage value is corrupted (and no cookie)", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "garbage");
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("returns default when cookie value is corrupted (no fallback to garbage)", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=garbage; path=/`;
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("returns default when localStorage access throws (private mode) and no cookie", () => {
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

  it("decodes URL-encoded cookie values", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent("sepia")}; path=/`;
    expect(readStoredTheme()).toBe("sepia");
  });

  it("ignores other unrelated cookies in the jar", () => {
    doc.cookie = `analytics_id=abc123; path=/`;
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    doc.cookie = `_ga=GA1.1.x.y; path=/`;
    expect(readStoredTheme()).toBe("sepia");
  });
});

/* ------------------------------------------------------------------ */
/*  applyTheme — writes both cookie and localStorage                   */
/* ------------------------------------------------------------------ */

describe("applyTheme", () => {
  it("sets the data-theme attribute on <html>", () => {
    applyTheme("sepia");
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("persists the chosen theme to the cookie (primary store)", () => {
    applyTheme("sepia");
    expect(doc.cookie).toContain(`${THEME_STORAGE_KEY}=sepia`);
  });

  it("persists the chosen theme to localStorage (legacy compatibility)", () => {
    applyTheme("sepia");
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe("sepia");
  });

  it("includes Path=/ so the cookie applies site-wide", () => {
    applyTheme("sepia");
    expect(doc._cookieMetaFor(THEME_STORAGE_KEY)).toContain("path=/");
  });

  it("includes a long max-age (multi-month persistence)", () => {
    applyTheme("sepia");
    const meta = doc._cookieMetaFor(THEME_STORAGE_KEY);
    const m = meta.match(/max-age=(\d+)/);
    expect(m).not.toBeNull();
    // A real persistence window — at least 30 days.
    expect(Number(m![1])).toBeGreaterThanOrEqual(60 * 60 * 24 * 30);
  });

  it("includes SameSite=Lax for top-level navigation safety", () => {
    applyTheme("sepia");
    expect(doc._cookieMetaFor(THEME_STORAGE_KEY)).toContain("SameSite=Lax");
  });

  it("adds Secure flag on HTTPS so the cookie can't leak over plain HTTP", () => {
    win.location.protocol = "https:";
    applyTheme("sepia");
    expect(doc._cookieMetaFor(THEME_STORAGE_KEY)).toContain("Secure");
  });

  it("omits Secure flag on http (localhost/dev)", () => {
    win.location.protocol = "http:";
    applyTheme("sepia");
    expect(doc._cookieMetaFor(THEME_STORAGE_KEY)).not.toContain("Secure");
  });

  it("normalizes invalid input before applying — never stamps garbage", () => {
    applyTheme("nonsense" as never);
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe(DEFAULT_THEME);
    expect(doc.cookie).toContain(`${THEME_STORAGE_KEY}=${DEFAULT_THEME}`);
  });

  it("returns the theme it actually applied (handy for state sync)", () => {
    expect(applyTheme("sepia")).toBe("sepia");
    expect(applyTheme("dark")).toBe("dark");
  });

  it("survives a localStorage that throws on setItem (still updates cookie + DOM)", () => {
    (globalThis as unknown as { window: { localStorage: { setItem: () => void } } }).window.localStorage.setItem =
      () => {
        throw new Error("QuotaExceeded");
      };
    expect(() => applyTheme("sepia")).not.toThrow();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
    expect(doc.cookie).toContain(`${THEME_STORAGE_KEY}=sepia`);
  });
});

/* ------------------------------------------------------------------ */
/*  Migration scenarios — legacy localStorage user → cookie            */
/* ------------------------------------------------------------------ */

describe("migration: legacy localStorage-only user", () => {
  it("readStoredTheme finds the legacy value, applyTheme writes a cookie", () => {
    // Pre-existing user state: localStorage set, cookie absent.
    win.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(doc.cookie).toBe("");

    // ThemeToggle's mount effect re-applies whatever read returned.
    const current = readStoredTheme();
    applyTheme(current);

    // After the migration, both stores agree.
    expect(doc.cookie).toContain(`${THEME_STORAGE_KEY}=sepia`);
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe("sepia");
  });
});

/* ------------------------------------------------------------------ */
/*  getThemeBootScript — FOUC prevention                              */
/* ------------------------------------------------------------------ */

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

  it("references document.cookie — cookie is the primary storage", () => {
    expect(getThemeBootScript()).toContain("document.cookie");
  });

  function runBoot() {
    new Function("window", "document", "localStorage", getThemeBootScript())(
      win,
      doc,
      win.localStorage,
    );
  }

  it("when executed with a cookie, applies that theme to <html>", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("when executed with cookie absent + localStorage set (legacy user), uses localStorage", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("prefers cookie over localStorage when both exist", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    win.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });

  it("when executed with no stored preference, applies the default theme", () => {
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
  });

  it("when executed with corrupted cookie, applies the default theme", () => {
    doc.cookie = `${THEME_STORAGE_KEY}=💥; path=/`;
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
  });

  it("when executed with corrupted localStorage and no cookie, applies the default theme", () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, "💥");
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe(DEFAULT_THEME);
  });

  it("ignores unrelated cookies during boot", () => {
    doc.cookie = `analytics=abc; path=/`;
    doc.cookie = `${THEME_STORAGE_KEY}=sepia; path=/`;
    doc.cookie = `something_else=xyz; path=/`;
    runBoot();
    expect(doc.documentElement.getAttribute(THEME_DOM_ATTRIBUTE)).toBe("sepia");
  });
});
