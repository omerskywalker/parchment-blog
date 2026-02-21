"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiOk = { ok: true };
type ApiErr = { ok: false; error: string; message?: string };
type ApiResponse = ApiOk | ApiErr;

export default function ResetPasswordForm({ token, next }: { token: string; next: string }) {
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const tokenMissing = !token || token.length < 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !data || ("ok" in data && data.ok === false)) {
        const code = (data && "error" in data && data.error) || "UNKNOWN";
        if (code === "RESET_TOKEN_INVALID") {
          setError("This reset link is invalid or expired. Please request a new one.");
        } else {
          setError("Could not reset password. Please try again.");
        }
        return;
      }

      setDone(true);

      // small delay so user sees success state
      setTimeout(() => {
        router.replace(`/signin?reset=1&next=${encodeURIComponent(next)}`);
        router.refresh();
      }, 450);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-60px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-[rgb(var(--card-foreground))] shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Set a new password for your account.
        </p>

        {tokenMissing && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
            This reset link is missing or invalid.{" "}
            <Link
              href={`/forgot-password?next=${encodeURIComponent(next)}`}
              className="underline underline-offset-4 hover:opacity-90"
            >
              Request a new one
            </Link>
            .
          </div>
        )}

        <div
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm transition-all duration-300",
            done
              ? "translate-y-0 border-white/10 bg-white/5 opacity-100"
              : "h-0 -translate-y-1 overflow-hidden border-transparent bg-transparent p-0 opacity-0",
          ].join(" ")}
          aria-hidden={!done}
        >
          Password updated. Redirecting to sign in…
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">New password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              type="password"
              required
              disabled={tokenMissing || loading}
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">Minimum 10 characters.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Confirm password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              type="password"
              required
              disabled={tokenMissing || loading}
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            disabled={tokenMissing || loading}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
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
