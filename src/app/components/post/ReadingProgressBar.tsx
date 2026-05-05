"use client";

import * as React from "react";
import { calcScrollProgress } from "@/lib/calcScrollProgress";

/**
 * Top-of-page reading progress band.
 *
 * Two big notes vs the previous version:
 *
 * 1. SMOOTH PROGRESSION. Old code called setState on every scroll
 *    event, which on iOS Safari fires at ~60Hz but React's commit
 *    cost made it stutter. Now we throttle to one rAF per frame and
 *    drive the visual via `transform: scaleX(p)` instead of `width`,
 *    which is a compositor-only mutation (no layout / paint), so the
 *    bar slides perfectly smoothly even mid-scroll.
 *
 * 2. PROMINENCE + THEME PARITY. Old bar was a thin amber-400/75
 *    sliver that read like a browser loading indicator. Now it's
 *    4px tall with a soft glow and matches the rest of the visual
 *    language: emerald-400 in dark mode (same hue family as the
 *    "Published" pill) and the sepia rust accent (--pb-accent) when
 *    [data-theme="sepia"] is active.
 */
export function ReadingProgressBar() {
  const fillRef = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;

    function compute() {
      ticking = false;
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      const p = calcScrollProgress(scrolled, total); // 0..100
      const ratio = Math.min(1, Math.max(0, p / 100));
      const node = fillRef.current;
      if (node) {
        // Compositor-only update: no React rerender, no layout.
        node.style.transform = `scaleX(${ratio})`;
      }
      // Hide entirely at the very top so the band doesn't sit as a
      // permanent decoration; reveal once the reader actually starts.
      setVisible((prev) => {
        const next = ratio > 0.0025;
        return prev === next ? prev : next;
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute(); // set initial value
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={[
        "pb-reading-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-1",
        // Faint track so the band reads as a UI element, not a
        // browser loading bar — full opacity feels too heavy.
        // Sepia override (warm ink track) lives in globals.css.
        "bg-white/5",
        visible ? "opacity-100" : "opacity-0",
        "transition-opacity duration-200",
      ].join(" ")}
    >
      <div
        ref={fillRef}
        className={[
          "pb-reading-progress-fill h-full w-full origin-left",
          // Width is driven via transform: scaleX, but we still want a
          // tiny eased transition so any rAF-skipped frame doesn't
          // pop. duration-100 + ease-out is the sweet spot — fast
          // enough to feel responsive, slow enough to smooth jitter.
          "transition-transform duration-100 ease-out",
          // Default (dark mode) — emerald to match the Published pill
          // hue family. Sepia override lives in globals.css.
          "bg-emerald-400",
        ].join(" ")}
        style={{
          transform: "scaleX(0)",
          willChange: "transform",
          // Soft glow gives prominence without the bar feeling chunky.
          boxShadow: "0 0 8px rgba(52, 211, 153, 0.55), 0 0 2px rgba(52, 211, 153, 0.85)",
        }}
      />
    </div>
  );
}
