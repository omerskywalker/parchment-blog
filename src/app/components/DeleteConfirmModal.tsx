"use client";

import * as React from "react";

type Props = {
  title?: string;
  body?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteConfirmModal({
  title = "Delete this post?",
  body = "This action cannot be undone. The post will be permanently removed.",
  confirmLabel = "Delete",
  isDeleting = false,
  onConfirm,
  onCancel,
}: Props) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
        <h2 id="delete-modal-title" className="text-base font-semibold text-white">
          {title}
        </h2>

        <p className="mt-2 text-sm text-white/60">{body}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
