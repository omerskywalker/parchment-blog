"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

export function OAuthButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-[rgb(var(--border))] bg-transparent px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white/80">
          <path d="M21.35 11.1H12v2.98h5.37c-.23 1.26-1.4 3.7-5.37 3.7-3.23 0-5.86-2.67-5.86-5.96s2.63-5.96 5.86-5.96c1.84 0 3.07.79 3.78 1.47l2.58-2.5C17.06 3.4 14.86 2.4 12 2.4 6.92 2.4 2.8 6.52 2.8 11.6S6.92 20.8 12 20.8c6.92 0 8.6-6.42 8.6-9.7 0-.65-.07-1.15-.15-1.6z" />
        </svg>
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl })}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-[rgb(var(--border))] bg-transparent px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white/80">
          <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.3 6.84 9.64.5.1.66-.22.66-.48 0-.24-.01-.88-.02-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.88 1.54 2.3 1.1 2.86.84.09-.66.35-1.1.63-1.36-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0112 6.8c.83.004 1.66.12 2.44.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.7 1.02 1.62 1.02 2.74 0 3.93-2.33 4.8-4.56 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.16.6.67.48A10.2 10.2 0 0022 12.2C22 6.58 17.52 2 12 2z" />
        </svg>
        <span>Continue with GitHub</span>
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px w-full bg-white/10" />
        <span className="text-xs text-[rgb(var(--muted))]">or</span>
        <div className="h-px w-full bg-white/10" />
      </div>
    </div>
  );
}
