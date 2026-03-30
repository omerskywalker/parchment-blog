"use client";

import * as React from "react";

type Props = {
  postId: string;
  onUndo: () => void;
  onDismiss: () => void;
};

/**
 * 5-second countdown toast shown after a post is auto-published.
 * Lets the author undo (revert to draft) before the timer expires.
 */
export default function AutoPublishToast({ onUndo, onDismiss }: Props) {
  const [remaining, setRemaining] = React.useState(5);

  React.useEffect(() => {
    if (remaining <= 0) {
      onDismiss();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-emerald-500/30 bg-black/90 px-5 py-3 shadow-xl backdrop-blur-sm"
    >
      <span className="text-sm text-emerald-200">Post published.</span>
      <button
        onClick={onUndo}
        className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/90 transition-colors hover:bg-white/15"
      >
        Undo ({remaining}s)
      </button>
    </div>
  );
}
