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
type StatsErr = { ok: false; error: string; message?: string };
type Stats = StatsOk | StatsErr;

function qk(slug: string) {
  return ["post-stats", slug] as const;
}

export default function PostStatsBar({ slug, initialViewCount, initialFireCount }: Props) {
  const qc = useQueryClient();

  const stats = useQuery<Stats>({
    queryKey: qk(slug),
    queryFn: async () => {
      return (await fetchPostStats(slug)) as Stats;
    },
    initialData: {
      ok: true as const,
      viewCount: initialViewCount,
      fireCount: initialFireCount,
      firedByMe: false,
    },
    staleTime: 10_000,
    retry: false,
  });

  const s = stats.data.ok ? stats.data : null;

  const [viewTick, setViewTick] = React.useState(0);
  const [fireTick, setFireTick] = React.useState(0);

  const prevView = React.useRef<number>(s?.viewCount ?? initialViewCount);
  const prevFire = React.useRef<number>(s?.fireCount ?? initialFireCount);

  const viewCountVal = s?.viewCount;
  const fireCountVal = s?.fireCount;

  React.useEffect(() => {
    if (viewCountVal == null || fireCountVal == null) return;

    if (viewCountVal !== prevView.current) {
      prevView.current = viewCountVal;
      setViewTick((n) => n + 1);
    }

    if (fireCountVal !== prevFire.current) {
      prevFire.current = fireCountVal;
      setFireTick((n) => n + 1);
    }
  }, [viewCountVal, fireCountVal]);

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
        // if request fails, roll back the optimistic increment
        qc.setQueryData<Stats>(qk(slug), (old) => {
          if (!old || !old.ok) return old;
          return { ...old, viewCount: Math.max(0, (old.viewCount ?? initialViewCount) - 1) };
        });
        sessionStorage.removeItem(key);
      });
  }, [slug, qc, initialViewCount]);

  // ---- fire mutation with optimistic update + rollback
  const fireMut = useMutation({
    mutationFn: async () => (await toggleFire(slug)) as Stats,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk(slug) });
      const prev = qc.getQueryData<Stats>(qk(slug));

      qc.setQueryData<Stats>(qk(slug), (old) => {
        if (!old || !old.ok) return old;
        const nextFired = !old.firedByMe;
        const nextCount = (old.fireCount ?? initialFireCount) + (nextFired ? 1 : -1);
        return { ...old, firedByMe: nextFired, fireCount: Math.max(0, nextCount) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData<Stats>(qk(slug), ctx.prev);
    },
    onSuccess: (data) => {
      if (data && data.ok) {
        qc.setQueryData<Stats>(qk(slug), (old) => {
          if (!old || !old.ok) return old;
          return { ...old, firedByMe: data.firedByMe, fireCount: data.fireCount };
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
        <span key={viewTick} className="pb-num tabular-nums">
          {viewCount}
        </span>
      </div>

      {/* fire */}
      <button
        type="button"
        onClick={() => fireMut.mutate()}
        disabled={fireMut.isPending}
        className={[
          "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1 text-sm transition-colors disabled:opacity-60",
          firedByMe
            ? "border-orange-500/30 bg-orange-500/15 text-orange-100"
            : "border-white/10 bg-black/30 text-white/80 hover:bg-black/40",
        ].join(" ")}
      >
        <span className={firedByMe ? "pb-pop" : ""}>🔥</span>
        <span key={fireTick} className="pb-num tabular-nums">
          {fireCount}
        </span>
      </button>
    </div>
  );
}
