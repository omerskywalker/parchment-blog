/**
 * Single source of truth for the Parchment theme system.
 *
 * The site supports two themes:
 *   - "dark"  — the original modern black/white look (default for new visitors)
 *   - "sepia" — warm cream parchment with deep ink text and serif body
 *
 * Implementation:
 *   - The current theme lives on <html data-theme="..."> at runtime.
 *   - User preference persists in localStorage under THEME_STORAGE_KEY.
 *   - To prevent FOUC, an inline <script> in <head> reads localStorage and
 *     stamps the attribute synchronously before React hydrates. See
 *     getThemeBootScript() below.
 *
 * This file is server-safe (no "use client") so it can be imported from
 * server components. All DOM access is guarded by `typeof document` checks.
 */

export const THEMES = ["dark", "sepia"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "parchment-theme";
export const THEME_DOM_ATTRIBUTE = "data-theme";

/**
 * Narrow an unknown value (typically from localStorage) to a valid Theme,
 * or fall back to the default. Defensive against tampered storage.
 */
export function normalizeTheme(value: unknown): Theme {
  return (THEMES as readonly string[]).includes(value as string)
    ? (value as Theme)
    : DEFAULT_THEME;
}

/**
 * Toggle between the two themes. Pure function — easy to unit-test.
 */
export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "sepia" : "dark";
}

/**
 * Read the persisted theme from localStorage. Safe to call on the server
 * (returns the default). Safe to call before hydration on the client.
 */
export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Stamp the theme onto <html> and persist it. No-op on the server.
 * Returning the applied theme is convenient for callers that want to
 * sync local state in the same tick.
 */
export function applyTheme(theme: Theme): Theme {
  const next = normalizeTheme(theme);
  if (typeof document === "undefined") return next;
  document.documentElement.setAttribute(THEME_DOM_ATTRIBUTE, next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore — private browsing modes can throw on setItem
  }
  return next;
}

/**
 * Returns the inline <script> source string injected into the document
 * <head> by the root layout. Runs before any React code, before any
 * paint, so the user never sees a dark flash before sepia kicks in.
 *
 * Kept tiny on purpose — every byte ships in every HTML response.
 *
 * The script is wrapped in a try/catch because some environments
 * (e.g. iframes with cookies disabled) throw on localStorage access.
 * On any failure we leave the document at the default theme.
 */
export function getThemeBootScript(): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(t==="dark"||t==="sepia"){document.documentElement.setAttribute(${JSON.stringify(
    THEME_DOM_ATTRIBUTE,
  )},t);}else{document.documentElement.setAttribute(${JSON.stringify(
    THEME_DOM_ATTRIBUTE,
  )},${JSON.stringify(DEFAULT_THEME)});}}catch(e){}})();`;
}
