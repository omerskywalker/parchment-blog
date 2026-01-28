"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Parchment Blog
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          {status === "loading" ? null : user ? (
            <>
              <Link
                href="/dashboard"
                className="
                  rounded-md px-3 py-1.5 text-sm text-white/80
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                  hover:text-white
                "
              >
                Dashboard
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="
                  rounded-md px-3 py-1.5 text-sm text-white/80
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                  hover:text-white
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
                  rounded-md px-3 py-1.5 text-sm text-white/80
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                  hover:text-white
                "
              >
                Sign in
              </Link>

              <Link
                href="/register"
                className="
                  rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/90
                  transition-colors
                  hover:bg-[rgba(127,127,127,0.12)]
                  hover:text-white
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
