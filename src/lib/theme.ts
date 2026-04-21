/**
 * Single source of truth for the Parchment theme system.
 *
 * The site supports two themes:
 *   - "dark"  — the original modern black/white look (default for new visitors)
 *   - "sepia" — warm cream parchment with deep ink text and serif body
 *
 * Implementation:
 *   - The current theme lives on <html data-theme="..."> at runtime.
 *   - User preference persists in a cookie under THEME_STORAGE_KEY (so the
 *     server can read it for SSR and so it survives across subdomains).
 *     localStorage is also written for backwards-compatibility with users
 *     who first visited before cookie storage was added; the boot script
 *     reads cookie → localStorage → default in that order.
 *   - To prevent FOUC, an inline <script> in <head> reads the cookie and
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

/** Cookie lives for one year — long enough to feel persistent. */
const THEME_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/**
 * Narrow an unknown value (typically from storage) to a valid Theme,
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
 * Read the persisted theme from the document's cookies. Falls back to
 * localStorage for users who haven't been migrated yet, then to the
 * default. Safe to call on the server (returns the default).
 */
export function readStoredTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;

  const fromCookie = readThemeCookieFromDocument();
  if (fromCookie) return fromCookie;

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Stamp the theme onto <html> and persist it to the cookie + localStorage.
 * No-op on the server. Returning the applied theme is convenient for
 * callers that want to sync local state in the same tick.
 */
export function applyTheme(theme: Theme): Theme {
  const next = normalizeTheme(theme);
  if (typeof document === "undefined") return next;

  document.documentElement.setAttribute(THEME_DOM_ATTRIBUTE, next);

  // Cookie: primary persistence (server-readable, survives across tabs).
  // Secure flag is added on HTTPS so the cookie can never leak over plain
  // HTTP; localhost stays unflagged so dev still works.
  try {
    const isHttps =
      typeof window !== "undefined" && window.location?.protocol === "https:";
    document.cookie =
      `${THEME_STORAGE_KEY}=${encodeURIComponent(next)};` +
      `path=/;` +
      `max-age=${THEME_COOKIE_MAX_AGE_SEC};` +
      `SameSite=Lax` +
      (isHttps ? `;Secure` : ``);
  } catch {
    // ignore — some sandboxed environments throw on document.cookie writes
  }

  // localStorage: best-effort secondary write, kept for parity with the
  // pre-migration boot script and for any code that still reads it.
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore — private browsing modes can throw on setItem
  }

  return next;
}

/**
 * Parse the theme out of `document.cookie`. Returns `null` (rather than
 * the default) if the cookie isn't present, so callers can distinguish
 * "no cookie set" from "cookie set to dark".
 */
function readThemeCookieFromDocument(): Theme | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie || "";
  const prefix = `${THEME_STORAGE_KEY}=`;
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        const value = decodeURIComponent(trimmed.slice(prefix.length));
        return (THEMES as readonly string[]).includes(value)
          ? (value as Theme)
          : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Returns the inline <script> source string injected into the document
 * <head> by the root layout. Runs before any React code, before any
 * paint, so the user never sees a dark flash before sepia kicks in.
 *
 * Reads the theme cookie first (the new persistence mechanism), then
 * falls back to localStorage (legacy users), then to the default.
 *
 * Kept tiny on purpose — every byte ships in every HTML response.
 *
 * The script is wrapped in a try/catch because some environments
 * (e.g. iframes with cookies disabled) throw on storage access.
 * On any failure we leave the document at the default theme.
 */
export function getThemeBootScript(): string {
  const KEY = JSON.stringify(THEME_STORAGE_KEY);
  const ATTR = JSON.stringify(THEME_DOM_ATTRIBUTE);
  const DEFAULT = JSON.stringify(DEFAULT_THEME);
  return (
    `(function(){try{` +
    `var t=null;` +
    `var c=document.cookie||"";` +
    `var p=${KEY}+"=";` +
    `var parts=c.split(";");` +
    `for(var i=0;i<parts.length;i++){` +
    `var s=parts[i].replace(/^\\s+/,"");` +
    `if(s.indexOf(p)===0){t=decodeURIComponent(s.substring(p.length));break;}` +
    `}` +
    `if(t!=="dark"&&t!=="sepia"){try{t=localStorage.getItem(${KEY});}catch(e){}}` +
    `if(t==="dark"||t==="sepia"){document.documentElement.setAttribute(${ATTR},t);}` +
    `else{document.documentElement.setAttribute(${ATTR},${DEFAULT});}` +
    `}catch(e){}})();`
  );
}
