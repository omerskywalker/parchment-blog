export type PostStats =
  | { ok: true; viewCount: number; fireCount: number; firedByMe: boolean }
  | { ok: false; error: string; message?: string };

export async function fetchPostStats(slug: string): Promise<PostStats> {
  const res = await fetch(`/api/posts/${slug}/stats`, { method: "GET" });
  return res.json();
}

export type ViewResponse =
  | { ok: true; slug: string; viewCount: number }
  | { ok: false; error: string; message?: string };

export async function recordView(slug: string): Promise<ViewResponse> {
  const res = await fetch(`/api/posts/${slug}/view`, { method: "POST" });
  return res.json();
}

export type FireResponse =
  | { ok: true; firedByMe: boolean; fireCount: number }
  | { ok: false; error: string; message?: string };

export async function toggleFire(slug: string): Promise<FireResponse> {
  const res = await fetch(`/api/posts/${slug}/fire`, { method: "POST" });
  return res.json();
}
