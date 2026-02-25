"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPostStats, recordView, toggleFire } from "@/lib/api/post-stats";

type Props = {
  slug: string;
  initialViewCount: number;
  initialFireCount: number;
  showViews?: boolean;
  className?: string;
  size?: "sm" | "md";
};

type StatsOk = { ok: true; viewCount: number; fireCount: number; firedByMe: boolean };
type StatsErr = { ok: false; error: string; message?: string };
type Stats = StatsOk | StatsErr;

function qk(slug: string) {
  return ["post-stats", slug] as const;
}

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function PostStatsBar({
  slug,
  initialViewCount,
  initialFireCount,
  showViews = true,
  className,
  size = "md",
}: Props) {
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

  // view increment (optimistic + session guard)
  React.useEffect(() => {
    const key = `pb_viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

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
        qc.setQueryData<Stats>(qk(slug), (old) => {
          if (!old || !old.ok) return old;
          return { ...old, viewCount: Math.max(0, (old.viewCount ?? initialViewCount) - 1) };
        });
        sessionStorage.removeItem(key);
      });
  }, [slug, qc, initialViewCount]);

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

  // Unify on h-10 everywhere (product feel)
  const heightClass = "h-10";
  const baseBtn =
    `${heightClass} inline-flex items-center gap-2 rounded-xl border px-4 text-sm ` +
    `transition-[transform,background-color,border-color,box-shadow] duration-200 ` +
    `hover:-translate-y-[1px] active:translate-y-0 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ` +
    `disabled:opacity-60 disabled:hover:translate-y-0`;

  const neutral =
    "border-white/10 bg-black/30 text-white/80 hover:bg-black/45 hover:border-white/25";

  const fired =
    "border-orange-500/35 bg-orange-500/15 text-orange-100 " +
    "shadow-[0_0_14px_rgba(249,115,22,0.20)]";

  // tiny count change anim: scale + fade in
  const countAnim = "transition-transform duration-200 will-change-transform";
  const bump = "animate-[pb_bump_220ms_ease-out]";

  return (
    <div className={cx("flex items-center gap-2", className)}>
      {showViews && (
        <div className={cx(baseBtn, neutral)}>
          <span className="opacity-80">👁</span>
          <span
            key={viewTick}
            className={cx("tabular-nums", countAnim, bump)}
            aria-label={`${viewCount} views`}
          >
            {viewCount}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => fireMut.mutate()}
        disabled={fireMut.isPending}
        className={cx(baseBtn, "cursor-pointer", firedByMe ? fired : neutral)}
        aria-pressed={firedByMe}
        aria-label={firedByMe ? "Remove fire reaction" : "Add fire reaction"}
      >
        <span
          className={cx("transition-transform duration-200", firedByMe ? "scale-[1.06]" : "")}
          aria-hidden="true"
        >
          🔥
        </span>
        <span
          key={fireTick}
          className={cx("tabular-nums", countAnim, bump)}
          aria-label={`${fireCount} fires`}
        >
          {fireCount}
        </span>
      </button>

      {/* local keyframes (Tailwind arbitrary animate uses this name) */}
      <style jsx global>{`
        @keyframes pb_bump {
          0% {
            transform: scale(0.96);
            opacity: 0.75;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
