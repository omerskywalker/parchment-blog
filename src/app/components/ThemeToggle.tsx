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
  const label =
    target === "sepia"
      ? "Switch to parchment theme"
      : "Switch to dark theme";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(applyTheme(target))}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white"
    >
      {theme === "dark" ? <ParchmentIcon /> : <MoonIcon />}
    </button>
  );
}

/**
 * Hand-rolled SVGs so we don't pull in an icon library just for two glyphs.
 * Each icon represents the OTHER theme (i.e. what you'll switch TO).
 */

function ParchmentIcon() {
  // Suggests "switch to parchment" — a stylized scroll/page corner
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M5 4h10l4 4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M15 4v4h4" />
      <path d="M7 12h8M7 15h8M7 18h5" />
    </svg>
  );
}

function MoonIcon() {
  // Suggests "switch back to dark"
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
