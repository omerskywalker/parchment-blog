"use client";

import * as React from "react";

type Stats =
  | { ok: true; viewCount: number; fireCount: number; firedByMe: boolean }
  | { ok: false; error: string; message?: string };

export function PostStatsBar({ slug }: { slug: string }) {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [busy, setBusy] = React.useState(false);

  // prevent dev-mode double increment + avoid re-counting per session
  React.useEffect(() => {
    const key = `pb_viewed:${slug}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      fetch(`/api/posts/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => {});
    }

    fetch(`/api/posts/${encodeURIComponent(slug)}/stats`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({ ok: false, error: "STATS_ERROR", message: "Unable to load stats." }));
  }, [slug]);

  async function toggleFire() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/fire`, { method: "POST" });
      const data = (await res.json()) as { ok: true; fired: boolean; fireCount: number } | any;

      if (!res.ok || !data.ok) throw new Error(data?.message ?? "Request failed.");

      setStats((prev) => {
        if (!prev || !prev.ok) return prev;
        return { ...prev, firedByMe: data.fired, fireCount: data.fireCount };
      });
    } catch {
      // noop for now
    } finally {
      setBusy(false);
    }
  }

  const viewCount = stats?.ok ? stats.viewCount : null;
  const fireCount = stats?.ok ? stats.fireCount : null;
  const firedByMe = stats?.ok ? stats.firedByMe : false;

  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-white/60">
      <span className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1">
        👁️ {viewCount ?? "—"}
      </span>

      <button
        onClick={toggleFire}
        disabled={busy}
        className={[
          "cursor-pointer inline-flex items-center gap-2 rounded-md border px-2.5 py-1 transition-colors",
          firedByMe
            ? "border-orange-400/30 bg-orange-500/10 text-orange-200"
            : "border-white/10 bg-black/30 text-white/70 hover:bg-white/10",
          busy ? "opacity-60" : "",
        ].join(" ")}
      >
        🔥 <span>{fireCount ?? "—"}</span>
      </button>
    </div>
  );
}
