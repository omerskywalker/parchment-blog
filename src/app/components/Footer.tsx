import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-black/20 py-8">
      <div className="mx-auto flex max-w-[845px] flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-white/80 transition-colors hover:text-white"
          >
            Parchment
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-xs text-white/40">Write without noise</span>
        </div>

        {/* Links */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/40"
          aria-label="Footer navigation"
        >
          <Link
            href="/posts"
            className="transition-colors hover:text-white/70"
          >
            Posts
          </Link>
          <Link
            href="/rss.xml"
            className="inline-flex items-center gap-1 transition-colors hover:text-white/70"
            aria-label="RSS feed"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
            </svg>
            RSS
          </Link>
          <Link
            href="/register"
            className="transition-colors hover:text-white/70"
          >
            Start writing
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-white/25">© {year} Parchment</p>
      </div>
    </footer>
  );
}
