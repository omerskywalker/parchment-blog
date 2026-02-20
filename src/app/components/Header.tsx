"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

const navLink =
  "rounded-md px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white";

export default function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const qc = useQueryClient();

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* --- brand --- */}
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Parchment Blog
        </Link>

        {/* --- nav --- */}
        <nav className="flex items-center gap-2">
          {/* --- public --- */}
          <Link href="/posts" className={navLink}>
            Posts
          </Link>

          {status === "loading" ? null : user ? (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>

              <Link
                href="/dashboard/profile"
                className="rounded-md px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white"
              >
                Profile
              </Link>

              <button
                className={navLink}
                onClick={async () => {
                  qc.clear();
                  await signOut({ callbackUrl: "/" });
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className={navLink}>
                Sign in
              </Link>

              <Link
                href="/register"
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white"
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
