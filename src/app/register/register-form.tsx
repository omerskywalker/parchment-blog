"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { OAuthButtons } from "../components/auth/oauth-buttons";

type ApiOk = { ok: true };
type ApiErr = { ok: false; error: string; message?: string; issues?: unknown };
type ApiResponse = ApiOk | ApiErr;

export default function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const callbackUrl = next || "/dashboard";

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function normalizeUsername(raw: string) {
    return raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/_+/g, "_")
      .slice(0, 30);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = normalizeUsername(username);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.ok) {
        if ("error" in data) {
          if (data.error === "CONFLICT") return setError("Email or username already in use.");
          if (data.error === "VALIDATION_ERROR" || data.error === "INVALID_INPUT")
            return setError("Please check your inputs and try again.");
          if (data.error === "INVALID_JSON") return setError("Invalid request. Please try again.");
        }
        return setError("Could not create account. Try again.");
      }

      // auto-login with credentials -> then send to profile setup
      const result = await signIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
      });

      if (result?.ok) {
        // 1) ensure session is updated
        await getSession();

        // 2) kill any cached "me" data from the previous user
        qc.removeQueries({ queryKey: ["me-profile"] });
        qc.removeQueries({ queryKey: ["me"] });

        // 3) go to profile setup
        router.replace(`/dashboard/profile?welcome=1&next=${encodeURIComponent(next)}`);

        // forces server components to re-render if any depend on session
        router.refresh();
        return;
      }

      router.replace(`/signin?next=${encodeURIComponent(next)}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const usernamePreview = username ? `/u/${normalizeUsername(username)}` : "/u/username";

  return (
    <main className="grid min-h-[calc(100vh-60px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-[rgb(var(--card-foreground))] shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">Register to start posting.</p>

        <OAuthButtons callbackUrl={callbackUrl} />

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Letters, numbers, underscores, hyphens. Public URL:{" "}
              <span className="opacity-80">{usernamePreview}</span>
            </p>
          </div>

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
              autoComplete="new-password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">Minimum 10 characters.</p>
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
            {loading ? "Creating..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
            Already have an account?{" "}
            <Link
              href={`/signin?next=${encodeURIComponent(next)}`}
              className="font-medium text-[rgb(var(--card-foreground))] underline underline-offset-4 hover:opacity-90"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
