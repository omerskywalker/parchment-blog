import { cookies } from "next/headers";

const COOKIE = "pb_vid";

/**
 * returns a stable visitor id via cookie.
 *  - if missing, sets a new cookie.
 */
export async function getOrSetVisitorId() {
  const jar = await cookies();
  let vid = jar.get(COOKIE)?.value;

  if (!vid) {
    vid = crypto.randomUUID();
    jar.set(COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return vid;
}
