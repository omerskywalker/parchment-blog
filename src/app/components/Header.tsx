"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

const navLink =
  "rounded-md px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-[rgba(127,127,127,0.12)] hover:text-white";

const mobileItem = "block w-full px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10";

function HamburgerIcon({ open, ...props }: React.SVGProps<SVGSVGElement> & { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={[
          "origin-center transition-transform duration-200 ease-out",
          open ? "scale-95 rotate-90 opacity-80" : "scale-100 rotate-0 opacity-100",
        ].join(" ")}
      />
    </svg>
  );
}

export default function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const qc = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  // enable CSS transitions after first paint to avoid initial flicker
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Close menu when clicking anywhere outside the menu/button + Escape
  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;

      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    qc.clear();
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        {/* --- brand --- */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
          onClick={() => setOpen(false)}
        >
          Parchment Blog
        </Link>

        {/* --- desktop nav --- */}
        <nav className="hidden items-center gap-2 sm:flex">
          <Link href="/posts" className={navLink}>
            Posts
          </Link>

          {status === "loading" ? null : user ? (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>

              <Link href="/dashboard/profile" className={navLink}>
                Profile
              </Link>

              <button className={navLink} onClick={handleSignOut}>
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

        {/* --- mobile menu --- */}
        <div className="relative sm:hidden">
          <button
            ref={buttonRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white/90 hover:bg-[rgba(127,127,127,0.12)]"
          >
            <HamburgerIcon open={open} className="h-5 w-5" />
          </button>

          {/* Dropdown (kept mounted for smooth exit) */}
          <div
            ref={menuRef}
            className={[
              "absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-black/95 shadow-lg",
              mounted ? "transition-all duration-150 ease-out" : "",
              open
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
            ].join(" ")}
          >
            <Link href="/posts" className={mobileItem} onClick={() => setOpen(false)}>
              Posts
            </Link>

            {status === "loading" ? null : user ? (
              <>
                <Link href="/dashboard" className={mobileItem} onClick={() => setOpen(false)}>
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/profile"
                  className={mobileItem}
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>

                <div className="my-1 h-px bg-white/10" />

                <button className={mobileItem} onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className={mobileItem} onClick={() => setOpen(false)}>
                  Sign in
                </Link>

                <Link href="/register" className={mobileItem} onClick={() => setOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
