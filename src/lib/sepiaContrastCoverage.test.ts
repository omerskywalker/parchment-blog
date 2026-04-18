import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Sepia theme color-utility coverage guard.
 *
 * The bug this catches:
 *   The sepia theme works by overriding specific dark-mode Tailwind utilities
 *   (`bg-black/X`, `bg-white/X`, `text-white/X`) with `[data-theme="sepia"] .X`
 *   selectors in globals.css. Any time a developer adds a new opacity tier
 *   (e.g. `text-white/35`) anywhere in the codebase, the sepia override has
 *   to be added too — otherwise that element renders white-on-cream in sepia
 *   and is invisible.
 *
 *   The first round of contrast bugs (article body H1 + lead, hero subtitle,
 *   form input fields) was exactly this: the components used opacity tiers
 *   that the sepia overrides hadn't yet been written for.
 *
 * What we check:
 *   1. Scan every .tsx file under src/app for usages of `bg-white/X`,
 *      `bg-black/X`, and `text-white/X` opacity utilities.
 *   2. Read globals.css.
 *   3. For each utility class found in the scan, assert that globals.css
 *      contains a `[data-theme="sepia"] .<escaped-class>` rule. The presence
 *      of the selector is sufficient evidence that an override is wired up.
 *
 * What we don't check:
 *   - The override is *correct* (e.g. the right ink shade) — that's a visual
 *     judgment call. We only enforce that an override exists, which is the
 *     mechanical part that's easy to forget.
 *   - Hover/focus variants. They're rare and most of them inherit base
 *     coverage anyway.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APP_DIR = path.join(REPO_ROOT, "src", "app");
const CSS_PATH = path.join(REPO_ROOT, "src", "app", "globals.css");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && (full.endsWith(".tsx") || full.endsWith(".ts"))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Find utility classes of the shapes:
 *   bg-white  bg-white/<num>
 *   bg-black  bg-black/<num>
 *   text-white  text-white/<num>
 * Returned as the bare class string (e.g. "text-white/55").
 *
 * We exclude `hover:`/`focus:`/`group-hover:` etc prefixes — those have their
 * own selector form in CSS and we cover the most common ones manually in
 * globals.css. The base utility is what disappears most often.
 */
function extractColorUtils(source: string): Set<string> {
  const found = new Set<string>();
  // Two shapes:
  //   bg-white          bg-white/<num>          bg-white/[0.07]
  //   bg-black          bg-black/<num>          bg-black/[0.05]
  //   text-white        text-white/<num>        text-white/[0.6]
  //   border-white      border-white/<num>      border-white/[0.07]
  // Negative lookahead `(?!\/)` after the optional `/digits` group prevents
  // matching bare `border-white` when the source actually contains the
  // arbitrary form `border-white/[0.07]` (which the second regex handles).
  const fixedRe = /(?<![:\w-])(bg-white|bg-black|text-white|border-white)(\/\d{1,3})?(?!\/)\b/g;
  const arbRe = /(?<![:\w-])(bg-white|bg-black|text-white|border-white)\/\[[\d.]+\]/g;
  for (const m of source.matchAll(fixedRe)) found.add(m[1] + (m[2] ?? ""));
  for (const m of source.matchAll(arbRe)) found.add(m[0]);
  return found;
}

/**
 * Build a regex that matches `[data-theme="sepia"] .<class>` accounting for
 * Tailwind's CSS-escaped slash (e.g. `text-white/55` → `.text-white\/55`).
 * We also accept the class appearing in a comma-separated selector list.
 */
function selectorRegex(cls: string): RegExp {
  // Tailwind escapes special chars in class selectors: `/` → `\/`,
  // `[` → `\[`, `]` → `\]`, `.` → `\.`. We need the regex to match the
  // CSS-escaped form found in globals.css (e.g. `.bg-white\/\[0\.07\]`).
  let escapedForCss = cls
    .replace(/\//g, "\\/")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\./g, "\\.");
  // Now escape that result for use inside a JS RegExp source.
  escapedForCss = escapedForCss.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[data-theme="sepia"\\][^{]*\\.${escapedForCss}(?:[\\s,{:]|$)`, "m");
}

const css = fs.readFileSync(CSS_PATH, "utf8");

const allUsedClasses = (() => {
  const all = new Set<string>();
  for (const file of walk(APP_DIR)) {
    const src = fs.readFileSync(file, "utf8");
    for (const cls of extractColorUtils(src)) all.add(cls);
  }
  return Array.from(all).sort();
})();

describe("Sepia theme contrast coverage", () => {
  it("scan produced a non-trivial set of classes (sanity check)", () => {
    // If the scanner is broken, the rest of the suite is meaningless.
    expect(allUsedClasses.length).toBeGreaterThan(10);
    expect(allUsedClasses).toContain("text-white");
    expect(allUsedClasses).toContain("bg-black");
  });

  it.each(allUsedClasses)(
    "globals.css has a sepia override for `%s`",
    (cls) => {
      const matched = selectorRegex(cls).test(css);
      if (!matched) {
        throw new Error(
          `Class \`${cls}\` is used in src/app but globals.css has no ` +
            `[data-theme="sepia"] .${cls.replace(/\//g, "\\/")} rule.\n\n` +
            `In sepia mode this element will inherit white-on-cream and be ` +
            `unreadable. Add an override block in globals.css next to the ` +
            `other ${cls.split("/")[0]} rules.`,
        );
      }
      expect(matched).toBe(true);
    },
  );
});
