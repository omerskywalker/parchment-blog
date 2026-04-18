"use client";

import * as React from "react";
import {
  type Theme,
  applyTheme,
  nextTheme,
  readStoredTheme,
} from "@/lib/theme";

/**
 * Header-mounted toggle that flips between the two Parchment themes.
 *
 * Behaviour:
 *   - On mount, syncs local state with whatever the boot script already
 *     stamped onto <html> (which itself came from localStorage). This keeps
 *     the icon in agreement with the actual theme on first paint.
 *   - On click, flips theme, persists it, and re-stamps <html>.
 *   - Renders a placeholder before mount to avoid hydration mismatches —
 *     the icon depends on a value that only exists after localStorage is read.
 *
 * The button intentionally uses the same visual language as the existing
 * header buttons (rounded border, subtle hover) so it doesn't visually
 * shout — it's the only persistent UI control in the chrome.
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme | null>(null);

  React.useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  if (theme === null) {
    // Reserve the space so layout doesn't jump after hydration.
    return <div className="h-9 w-9" aria-hidden="true" />;
  }

  const target = nextTheme(theme);
  // We follow the "show what you'll switch TO" convention — same pattern
  // GitHub, Linear, Stripe, Vercel all use. In dark mode you see a sun
  // (click for light/parchment); in sepia you see a moon (click for dark).
  // Universally understood, no icon-decoding required.
  const label =
    target === "sepia" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(applyTheme(target))}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/**
 * Hand-rolled SVGs so we don't pull in an icon library just for two glyphs.
 * Each icon represents the OTHER theme (i.e. what you'll switch TO).
 */

function SunIcon() {
  // Shown in dark mode — clicking switches to the light/parchment theme.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  // Shown in sepia/light mode — clicking switches back to dark.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
