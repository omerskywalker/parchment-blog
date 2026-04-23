"use client";

import { useState, useCallback } from "react";
import { ChevronDown, RefreshCw, Sparkles } from "lucide-react";

type Suggestion = { title: string; rationale: string };
type InsightsPayload = {
  summary: string;
  suggestions: Suggestion[];
  refreshedAt: string;
  cached: boolean;
};

export function DashboardInsights() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/insights${force ? "?force=1" : ""}`,
        { method: "POST" }
      );
      if (!res.ok) {
        if (res.status === 422) {
          setError("Write a few posts first — there's nothing to read yet.");
        } else if (res.status === 503) {
          setError("Insights are unavailable right now. Try again later.");
        } else {
          setError("Couldn't generate insights. Try again.");
        }
        return;
      }
      const json = (await res.json()) as InsightsPayload;
      setData(json);
    } catch {
      setError("Couldn't generate insights. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      void fetchInsights(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition-all">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4 flex-shrink-0 text-white/70" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase leading-none tracking-wider text-white/55">
            Where to take it next
          </div>
          {!open ? (
            <div className="mt-1 truncate text-xs text-white/80">
              {data
                ? "Tap to revisit your suggestions"
                : "AI-suggested directions based on your recent posts"}
            </div>
          ) : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-white/55 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {loading ? (
            <div className="space-y-3 py-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-12 animate-pulse rounded-md bg-white/[0.06]" />
              <div className="h-12 animate-pulse rounded-md bg-white/[0.06]" />
            </div>
          ) : error ? (
            <div className="py-2">
              <p className="text-sm text-white/70">{error}</p>
              <button
                type="button"
                onClick={() => void fetchInsights(true)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-white/70 underline underline-offset-4 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Try again
              </button>
            </div>
          ) : data ? (
            <>
              <p className="mb-3 text-sm italic leading-relaxed text-white/85">
                {data.summary}
              </p>

              <div className="mb-3 space-y-2">
                {data.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5"
                  >
                    <h3 className="text-sm font-semibold leading-snug text-white">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-xs leading-snug text-white/70">
                      {s.rationale}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>
                  {data.cached ? "Cached" : "Fresh"} ·{" "}
                  {new Date(data.refreshedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => void fetchInsights(true)}
                  className="inline-flex items-center gap-1 text-white/60 transition-colors hover:text-white"
                  aria-label="Regenerate insights"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
