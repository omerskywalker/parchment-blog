"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPostStats, recordView, toggleFire } from "@/lib/api/post-stats";

type Props = {
  slug: string;
  initialViewCount: number;
  initialFireCount: number;
};

type StatsOk = { ok: true; viewCount: number; fireCount: number; firedByMe: boolean };

function qk(slug: string) {
  return ["post-stats", slug] as const;
}

export default function PostStatsBar({ slug, initialViewCount, initialFireCount }: Props) {
  const qc = useQueryClient();

  // SSR baseline so no flash
  const stats = useQuery({
    queryKey: qk(slug),
    queryFn: () => fetchPostStats(slug),
    initialData: {
      ok: true as const,
      viewCount: initialViewCount,
      fireCount: initialFireCount,
      firedByMe: false, // client will correct immediately via /stats
    },
    staleTime: 10_000,
    retry: false,
  });

  const s = (stats.data && stats.data.ok ? (stats.data as StatsOk) : null);

  // ---- animations: trigger only on value changes
  const [viewTick, setViewTick] = React.useState(0);
  const [fireTick, setFireTick] = React.useState(0);

  const prevView = React.useRef<number>(s?.viewCount ?? initialViewCount);
  const prevFire = React.useRef<number>(s?.fireCount ?? initialFireCount);

  React.useEffect(() => {
    if (!s) return;
    if (s.viewCount !== prevView.current) {
      prevView.current = s.viewCount;
      setViewTick((n) => n + 1);
    }
    if (s.fireCount !== prevFire.current) {
      prevFire.current = s.fireCount;
      setFireTick((n) => n + 1);
    }
  }, [s?.viewCount, s?.fireCount]); // intentionally minimal

  // ---- record view (dedupe per tab)
  React.useEffect(() => {
    const key = `pb_viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    // optimistic + then sync
    qc.setQueryData(qk(slug), (old: any) => {
      if (!old?.ok) return old;
      return { ...old, viewCount: (old.viewCount ?? initialViewCount) + 1 };
    });

    recordView(slug)
      .then((r) => {
        if (r && (r as any).ok) {
          qc.setQueryData(qk(slug), (old: any) => {
            if (!old?.ok) return old;
            return { ...old, viewCount: (r as any).viewCount };
          });
        }
      })
      .catch(() => {
        // if request fails, roll back the optimistic increment
        qc.setQueryData(qk(slug), (old: any) => {
          if (!old?.ok) return old;
          return { ...old, viewCount: Math.max(0, (old.viewCount ?? initialViewCount) - 1) };
        });
        sessionStorage.removeItem(key);
      });
  }, [slug, qc, initialViewCount]);

  // ---- fire mutation with optimistic update + rollback
  const fireMut = useMutation({
    mutationFn: () => toggleFire(slug),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk(slug) });
      const prev = qc.getQueryData(qk(slug));

      qc.setQueryData(qk(slug), (old: any) => {
        if (!old?.ok) return old;
        const nextFired = !old.firedByMe;
        const nextCount = (old.fireCount ?? initialFireCount) + (nextFired ? 1 : -1);
        return { ...old, firedByMe: nextFired, fireCount: Math.max(0, nextCount) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk(slug), ctx.prev);
    },
    onSuccess: (data) => {
      if (data && (data as any).ok) {
        qc.setQueryData(qk(slug), (old: any) => {
          if (!old?.ok) return old;
          return { ...old, firedByMe: (data as any).firedByMe, fireCount: (data as any).fireCount };
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk(slug) });
    },
  });

  const viewCount = s?.viewCount ?? initialViewCount;
  const fireCount = s?.fireCount ?? initialFireCount;
  const firedByMe = s?.firedByMe ?? false;

  return (
    <div className="mt-4 flex items-center gap-2">
      {/* views */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-sm text-white/80">
        <span className="opacity-80">👁</span>
        <span key={viewTick} className="tabular-nums pb-num">
          {viewCount}
        </span>
      </div>

      {/* fire */}
      <button
        type="button"
        onClick={() => fireMut.mutate()}
        disabled={fireMut.isPending}
        className={[
          "cursor-pointer inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm transition-colors disabled:opacity-60",
          firedByMe
            ? "border-orange-500/30 bg-orange-500/15 text-orange-100"
            : "border-white/10 bg-black/30 text-white/80 hover:bg-black/40",
        ].join(" ")}
      >
        <span className={firedByMe ? "pb-pop" : ""}>🔥</span>
        <span key={fireTick} className="tabular-nums pb-num">
          {fireCount}
        </span>
      </button>
    </div>
  );
}
