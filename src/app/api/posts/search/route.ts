import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/http";
import { searchPosts, sanitizeSearchQuery } from "@/lib/server/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const safe = sanitizeSearchQuery(q);

  if (!safe) {
    return jsonOk({ posts: [] });
  }

  if (safe.length > 200) {
    return jsonError("Query too long.", 400);
  }

  try {
    const posts = await searchPosts(safe);
    return jsonOk({ posts });
  } catch {
    return jsonError("Search failed.", 500);
  }
}
