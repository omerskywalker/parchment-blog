"use client";

import * as React from "react";

type Props = {
  title: string;
  className?: string;
  size?: "sm" | "md";
};

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

  const heightClass = size === "sm" ? "h-10" : "h-9";

  const baseBtn =
    `${heightClass} inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white/85 ` +
    `transition-[transform,background-color,border-color,box-shadow] duration-200 ` +
    `hover:bg-black/45 hover:border-white/20 hover:-translate-y-[1px] active:translate-y-0 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20`;

  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      <button type="button" onClick={copyLink} className={baseBtn}>
        <span aria-hidden="true">⛓</span>
        <span>{copied ? "Copied" : "Copy link"}</span>
      </button>

      <button type="button" onClick={share} className={baseBtn}>
        <span aria-hidden="true">↗</span>
        <span>Share</span>
      </button>
    </div>
  );
}
