"use client";

import * as React from "react";

/**
 * Soft reminder banner shown in the dashboard when email is unverified.
 * Non-blocking — authors can still post and use the app.
 */
export default function VerifyEmailBanner() {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  async function resend() {
    setLoading(true);
    try {
      await fetch("/api/auth/send-verification", { method: "POST" });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200"
    >
      <span>
        {sent ? "Verification email sent — check your inbox." : "Please verify your email address."}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {!sent && (
          <button
            onClick={resend}
            disabled={loading}
            className="rounded-md border border-amber-400/30 px-2.5 py-1 text-xs transition-colors hover:bg-amber-400/10 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Resend email"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-md px-2 py-1 text-amber-200/60 transition-colors hover:text-amber-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}
