import { NextResponse, type NextRequest } from "next/server";

function isSignedIn(req: NextRequest) {
  return (
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token")
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const signedIn = isSignedIn(req);

  if (pathname.startsWith("/dashboard")) {
    if (!signedIn) {
      const dest = `/signin?next=${encodeURIComponent(`${pathname}${search}`)}`;
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/signin" || pathname === "/register") {
    if (signedIn) {
      const next = req.nextUrl.searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(new URL(safeNext, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/register"],
};
