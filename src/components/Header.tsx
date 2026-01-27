"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data, status } = useSession();
  const user = data?.user;

  return (
    <header
      className="
        sticky top-0 z-10 border-b
        bg-[rgb(var(--card))]
        text-[rgb(var(--card-foreground))]
        border-[rgb(var(--border))]
      "
    >
      <div className="mx-auto flex h-[60px] max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Parchment Blog
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-[rgb(var(--muted))]">Loading…</span>
          ) : user ? (
            <>
              <span className="hidden sm:inline text-[rgb(var(--muted))]">
                {user.name ?? user.email}
              </span>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="
                  rounded-md border px-3 py-1.5
                  border-[rgb(var(--border))]
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                "
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="
                  rounded-md px-3 py-1.5
                  text-[rgb(var(--muted))]
                  transition-colors
                  hover:text-[rgb(var(--card-foreground))]
                  hover:bg-[rgba(127,127,127,0.12)]
                "
              >
                Sign in
              </Link>

              <Link
                href="/register"
                className="
                  rounded-md border px-3 py-1.5
                  border-[rgb(var(--border))]
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                "
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
