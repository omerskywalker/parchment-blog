"use client";

import * as React from "react";
import Link from "next/link";

type ApiOk = { ok: true };
type ApiErr = { ok: false; error: string; message?: string };
type ApiResponse = ApiOk | ApiErr;

export default function ForgotPasswordForm({ next }: { next: string }) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // will always show success to avoid account enumeration
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      // even if server returns error, show sent unless it’s a hard network failure
      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok && data && "ok" in data && data.ok === false) {
        // still show sent to avoid leaking info
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-60px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-[rgb(var(--card-foreground))] shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Enter your email and we’ll send a reset link.
        </p>

        <div
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm transition-all duration-300",
            sent
              ? "translate-y-0 border-white/10 bg-white/5 opacity-100"
              : "h-0 -translate-y-1 overflow-hidden border-transparent bg-transparent p-0 opacity-0",
          ].join(" ")}
          aria-hidden={!sent}
        >
          If an account exists for that email, we sent a reset link. Check your inbox (and spam).
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
            Remembered it?{" "}
            <Link
              href={`/signin?next=${encodeURIComponent(next)}`}
              className="font-medium text-[rgb(var(--card-foreground))] underline underline-offset-4 hover:opacity-90"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
