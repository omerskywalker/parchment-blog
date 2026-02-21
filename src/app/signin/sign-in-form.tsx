"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { OAuthButtons } from "../components/auth/oauth-buttons";

function prettyAuthError(code: string | null) {
  if (!code) return null;

  // common errors
  if (code === "OAuthAccountNotLinked") {
    return "This email is already associated with another sign-in method. Try the same provider you used before, or sign in with email/password.";
  }
  if (code === "OAuthCreateAccount") {
    return "Could not create your account with that provider. Please try again, or use email/password.";
  }
  if (code === "Configuration") {
    return "Auth is temporarily misconfigured. Please try again later.";
  }
  if (code === "AccessDenied") {
    return "Access denied. Please try again.";
  }

  return "Sign-in failed. Please try again.";
}

export default function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = next || "/dashboard";

  const reset = sp.get("reset"); // ?reset=1
  const oauthError = sp.get("error");

  const bannerMessage =
    reset === "1"
      ? "Password updated. Please sign in with your new password."
      : prettyAuthError(oauthError);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res) {
      setError("Unexpected error. Try again.");
      return;
    }

    if (res.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(res.url ?? callbackUrl);
  }

  return (
    <main className="grid min-h-[calc(100vh-60px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-[rgb(var(--card-foreground))] shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">Welcome back.</p>

        {/* banner (reset success / oauth errors) */}
        <div
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm transition-all duration-300",
            bannerMessage
              ? "translate-y-0 border-white/10 bg-white/5 opacity-100"
              : "h-0 -translate-y-1 overflow-hidden border-transparent bg-transparent p-0 opacity-0",
          ].join(" ")}
          aria-hidden={!bannerMessage}
        >
          {bannerMessage}
        </div>

        <OAuthButtons callbackUrl={callbackUrl} />

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link
                href={`/forgot-password?next=${encodeURIComponent(callbackUrl)}`}
                className="text-xs text-[rgb(var(--muted))] underline underline-offset-4 hover:opacity-90"
              >
                Forgot password?
              </Link>
            </div>

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
            New here?{" "}
            <Link
              href={`/register?next=${encodeURIComponent(callbackUrl)}`}
              className="font-medium text-[rgb(var(--card-foreground))] underline underline-offset-4 hover:opacity-90"
            >
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
