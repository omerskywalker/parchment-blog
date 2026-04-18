"use client";

import * as React from "react";

type Props = {
  slug: string;
  title: string;
  size?: "sm" | "md";
  layout?: "row" | "grid";
  className?: string;
};

/**
 * Reader-facing toolbar for taking a post offline.
 *
 *   [ Save as PDF ]  [ Download .md ]  [ Share… ]
 *
 * - **PDF** triggers the browser's native print sheet. Combined with the
 *   `@media print` rules in globals.css, the printout uses the parchment
 *   palette and hides chrome. Default destination on every modern browser
 *   is "Save as PDF" — one extra click and the user gets a real PDF in
 *   Files / Drive / Notes / wherever they want it.
 * - **Markdown** is a plain anchor pointing at the API endpoint that
 *   returns the post body with frontmatter. The browser handles the
 *   download via Content-Disposition.
 * - **Share** uses the Web Share API where available (mobile Safari,
 *   mobile Chrome, recent desktop Safari). On platforms without it, the
 *   button is hidden — the existing PostShareActions row already gives
 *   them copy-link / X-share fallbacks, no point duplicating those here.
 */
export function PostExportActions({
  slug,
  title,
  size = "md",
  layout = "row",
  className,
}: Props) {
  const [canShare, setCanShare] = React.useState(false);
  const [busy, setBusy] = React.useState<"share" | null>(null);

  React.useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const sizing =
    size === "sm"
      ? "h-8 px-2.5 text-xs gap-1.5"
      : "h-9 px-3 text-sm gap-2";

  const base =
    "inline-flex items-center justify-center rounded-md border border-white/15 text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed";

  const onPrint = React.useCallback(() => {
    // The print stylesheet does all the heavy lifting; this just opens
    // the browser dialog. We deliberately do NOT change the document
    // structure or theme on click — @media print handles palette, chrome
    // hiding, and page breaks without touching screen rendering.
    if (typeof window !== "undefined") window.print();
  }, []);

  const onShare = React.useCallback(async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    setBusy("share");
    try {
      await navigator.share({
        title,
        text: title,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      });
    } catch {
      // User cancelled or share rejected — silently ignore. Throwing here
      // would just produce an unhelpful console error in normal flows.
    } finally {
      setBusy(null);
    }
  }, [title]);

  const containerClass =
    (layout === "grid"
      ? "grid grid-cols-2 gap-2"
      : "flex flex-wrap items-center gap-2") +
    (className ? ` ${className}` : "");

  return (
    <div className={containerClass} data-no-print="true">
      <button
        type="button"
        onClick={onPrint}
        className={`${base} ${sizing}`}
        title="Open the print dialog — choose 'Save as PDF' as the destination"
        aria-label="Save this post as a PDF"
      >
        <PrinterIcon />
        <span>Save as PDF</span>
      </button>

      <a
        href={`/api/posts/${encodeURIComponent(slug)}/markdown`}
        className={`${base} ${sizing}`}
        title="Download this post as a .md file (Obsidian, iA Writer, Bear, etc.)"
        aria-label="Download this post as Markdown"
      >
        <DownloadIcon />
        <span>Download .md</span>
      </a>

      {canShare ? (
        <button
          type="button"
          onClick={onShare}
          disabled={busy === "share"}
          className={`${base} ${sizing}`}
          title="Open the system share sheet (Notes, Mail, AirDrop, etc.)"
          aria-label="Share this post"
        >
          <ShareIcon />
          <span>Share…</span>
        </button>
      ) : null}
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3v13" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}
