"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const callbackUrl = next || "/dashboard";

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
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
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
