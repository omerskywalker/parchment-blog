"use client";

import * as React from "react";

type Props = {
  title: string;
  className?: string;
  size?: "sm" | "md";
};

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export function PostShareActions({ title, className, size = "md" }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
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

  // unify sizes to feel like one system
  const heightClass = "h-10";
  const baseBtn =
    `${heightClass} inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 ` +
    `bg-black/30 px-4 text-sm text-white/85 ` +
    `transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ` +
    `hover:bg-black/45 hover:border-white/25 hover:-translate-y-[1px] active:translate-y-0 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20`;

  // No-jump: keep label stable and show a badge overlay
  const copyMinW = size === "sm" ? "min-w-[132px]" : "min-w-[140px]";

  return (
    <div className={cx("flex items-center gap-2", className)}>
      <button type="button" onClick={copyLink} className={cx(baseBtn, copyMinW)}>
        <span aria-hidden="true" className="opacity-90">
          ⛓
        </span>

        <span className="relative">
          <span>Copy link</span>

          {/* badge */}
          <span
            className={cx(
              "pointer-events-none absolute top-1/2 -right-12 -translate-y-1/2",
              "rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] text-white/80",
              "transition-all duration-200",
              copied ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0",
            )}
            aria-hidden="true"
          >
            Copied
          </span>
        </span>
      </button>

      <button type="button" onClick={share} className={cx(baseBtn)}>
        <span aria-hidden="true" className="opacity-90">
          ↗
        </span>
        <span>Share</span>
      </button>
    </div>
  );
}
