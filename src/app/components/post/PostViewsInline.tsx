"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPostStats, recordView } from "@/lib/api/post-stats";

type StatsOk = { ok: true; viewCount: number; fireCount: number; firedByMe: boolean };
type StatsErr = { ok: false; error: string; message?: string };
type Stats = StatsOk | StatsErr;

function qk(slug: string) {
  return ["post-stats", slug] as const;
}

export default function PostViewsInline({
  slug,
  initialViewCount,
}: {
  slug: string;
  initialViewCount: number;
}) {
  const qc = useQueryClient();

  const stats = useQuery<Stats>({
    queryKey: qk(slug),
    queryFn: async () => (await fetchPostStats(slug)) as Stats,
    initialData: {
      ok: true as const,
      viewCount: initialViewCount,
      fireCount: 0,
      firedByMe: false,
    },
    staleTime: 10_000,
    retry: false,
  });

  const s = stats.data.ok ? stats.data : null;
  const viewCount = s?.viewCount ?? initialViewCount;

  const [tick, setTick] = React.useState(0);
  const prev = React.useRef(viewCount);

  React.useEffect(() => {
    if (viewCount !== prev.current) {
      prev.current = viewCount;
      setTick((n) => n + 1);
    }
  }, [viewCount]);

  React.useEffect(() => {
    const key = `pb_viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    // optimistic + then sync
    qc.setQueryData<Stats>(qk(slug), (old) => {
      if (!old || !old.ok) return old;
      return { ...old, viewCount: (old.viewCount ?? initialViewCount) + 1 };
    });

    recordView(slug)
      .then((r) => {
        const res = r as Stats;
        if (res && res.ok) {
          qc.setQueryData<Stats>(qk(slug), (old) => {
            if (!old || !old.ok) return old;
            return { ...old, viewCount: res.viewCount };
          });
        }
      })
      .catch(() => {
        // roll back
        qc.setQueryData<Stats>(qk(slug), (old) => {
          if (!old || !old.ok) return old;
          return { ...old, viewCount: Math.max(0, (old.viewCount ?? initialViewCount) - 1) };
        });
        sessionStorage.removeItem(key);
      });
  }, [slug, qc, initialViewCount]);

  return (
    <span className="inline-flex items-center gap-1.5 text-white/60">
      <span aria-hidden className="opacity-80">
        👁
      </span>
      <span key={tick} className="tabular-nums">
        {viewCount}
      </span>
    </span>
  );
}
