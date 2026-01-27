"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { ok: true }
  | { ok: false; error: string; issues?: unknown };

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.ok) {
        if ("error" in data) {
          if (data.error === "EMAIL_IN_USE")
            return setError("That email is already in use.");
          if (data.error === "INVALID_INPUT")
            return setError("Please check your inputs and try again.");
          if (data.error === "INVALID_JSON")
            return setError("Invalid request. Please try again.");
          return setError("Could not create account. Try again.");
        }
        return setError("Could not create account. Try again.");
      }

      router.push("/signin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-60px)] px-4 py-10 grid place-items-center">
      <section
        className="
          w-full max-w-md rounded-2xl border p-6 shadow-sm
          bg-[rgb(var(--card))] text-[rgb(var(--card-foreground))]
          border-[rgb(var(--border))]
        "
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Register to start posting.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Display name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="
                mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm
                bg-transparent border-[rgb(var(--border))]
                focus:outline-none focus:ring-2 focus:ring-black/20
              "
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
              required
              className="
                mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm
                bg-transparent border-[rgb(var(--border))]
                focus:outline-none focus:ring-2 focus:ring-black/20
              "
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
              className="
                mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm
                bg-transparent border-[rgb(var(--border))]
                focus:outline-none focus:ring-2 focus:ring-black/20
              "
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Minimum 10 characters.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="
              w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white
              hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium underline underline-offset-4 hover:opacity-90 text-[rgb(var(--card-foreground))]"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
