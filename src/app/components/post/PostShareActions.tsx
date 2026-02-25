"use client";

import * as React from "react";

type Props = {
  title: string;
  className?: string;
  size?: "sm" | "md";
  layout?: "inline" | "grid"; // grid for mobile equal-width layout
};

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export function PostShareActions({ title, className, size = "md", layout = "inline" }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  async function share() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // cancelled or failed — fallback
      }
    }

    await copyLink();
  }

  const heightClass = "h-10";

  const baseBtn =
    `${heightClass} inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 ` +
    `bg-black/30 px-4 text-sm text-white/85 ` +
    `transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ` +
    `hover:bg-black/45 hover:border-white/25 hover:-translate-y-[1px] active:translate-y-0 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20`;

  // Desktop: natural widths, but keep Copy comfortably sized.
  // Mobile grid: full width.
  const copyWidth =
    layout === "grid" ? "w-full" : size === "sm" ? "min-w-[104px]" : "min-w-[112px]";

  const wrapperClass =
    layout === "grid" ? "grid grid-cols-2 gap-2 w-full" : "flex flex-wrap items-center gap-2";

  return (
    <div className={cx(wrapperClass, className)}>
      <button type="button" onClick={copyLink} className={cx(baseBtn, copyWidth)}>
        <span
          aria-hidden="true"
          className={cx(
            "inline-flex w-4 justify-center transition-transform duration-200",
            copied ? "scale-110" : "",
          )}
        >
          {copied ? "✓" : "⛓"}
        </span>
        <span>Copy</span>
      </button>

      <button
        type="button"
        onClick={share}
        className={cx(baseBtn, layout === "grid" ? "w-full" : "")}
      >
        <span aria-hidden="true" className="opacity-90">
          ↗
        </span>
        <span>Share</span>
      </button>
    </div>
  );
}
