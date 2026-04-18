/**
 * Edge middleware — handles the `?v3=on|off` opt-in/opt-out URL parameter.
 *
 * When a visitor lands on any URL with `?v3=on`, we set the `pref-v3=1` cookie
 * (1 year) and redirect them to the same URL with the param stripped. From
 * that point on, every request from that browser sees the v3 experience.
 *
 * `?v3=off` does the opposite — sets `pref-v3=0` to explicitly opt out, even
 * if Edge Config has v3 globally enabled.
 *
 * Any other URL is passed through untouched (zero overhead).
 */

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "pref-v3";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const v3Param = url.searchParams.get("v3");

  if (v3Param !== "on" && v3Param !== "off") {
    return NextResponse.next();
  }

  // Build clean URL (without the ?v3 param)
  const cleanUrl = url.clone();
  cleanUrl.searchParams.delete("v3");

  const res = NextResponse.redirect(cleanUrl);
  res.cookies.set({
    name: COOKIE_NAME,
    value: v3Param === "on" ? "1" : "0",
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // readable by client if we ever want a debug banner
  });

  return res;
}

export const config = {
  // Only run on requests that might carry ?v3=. We can't filter on query
  // params in the matcher, so we run on all non-static paths and bail
  // immediately if the param isn't present.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|rss.xml|api/).*)"],
};
