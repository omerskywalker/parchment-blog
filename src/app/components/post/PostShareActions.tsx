"use client";

import * as React from "react";

type Props = {
  title: string;
  className?: string;
  size?: "sm" | "md";
  /**
   * Layout mode.
   * - "inline": natural-width buttons separated by gap (desktop).
   * - "grid": no wrapper of our own — buttons render as direct
   *   children of the parent grid (via `display: contents`) so a
   *   single grid-cols-3 at the page level can lay out
   *   Fire | Post | Share evenly without nesting grids.
   */
  layout?: "inline" | "grid";
};

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export function PostShareActions({ title, className, size: _size = "md", layout = "inline" }: Props) {
  // Internal helper used by the native share fallback. Not exposed
  // as its own button anymore — the dedicated Copy button was a
  // duplicate of what Share already does on platforms without
  // navigator.share, so it was dropped to free up the action row.
  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or platform refused — fall through to copy
      }
    }
    await copyLink();
  }

  function shareOnX() {
    const url = window.location.href;
    const text = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(url);
    window.open(
      `https://x.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const heightClass = "h-10";

  const baseBtn =
    `${heightClass} inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 ` +
    `bg-black/30 px-4 text-sm text-white/85 ` +
    `transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ` +
    `hover:bg-black/45 hover:border-white/25 hover:-translate-y-[1px] active:translate-y-0 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 cursor-pointer`;

  // In grid mode, the wrapper uses `display: contents` so the
  // individual buttons participate directly in the parent's grid
  // tracks. This lets the page lay out [Fire | Post | Share] in a
  // single grid-cols-3 without each component fighting for its own
  // sub-grid. Each button gets `w-full` so its grid cell fills.
  const gridMode = layout === "grid";
  const wrapperClass = gridMode ? "contents" : "flex flex-wrap items-center gap-2";
  const widthClass = gridMode ? "w-full" : "";

  return (
    <div className={cx(wrapperClass, className)}>
      {/* Share to X / Twitter */}
      <button
        type="button"
        onClick={shareOnX}
        aria-label="Share on X"
        className={cx(baseBtn, widthClass)}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4 fill-current opacity-80"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
        <span>Post</span>
      </button>

      {/* Native share / fallback to copy */}
      <button
        type="button"
        onClick={share}
        aria-label="Share post"
        className={cx(baseBtn, widthClass)}
      >
        <span aria-hidden="true" className="opacity-90">
          ↗
        </span>
        <span>Share</span>
      </button>
    </div>
  );
}
