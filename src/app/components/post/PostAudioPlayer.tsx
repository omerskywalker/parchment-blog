"use client";

import * as React from "react";

type AudioStatus =
  | "idle"
  | "loading" // initial GET in flight
  | "generating" // POST kicked off + polling for ready
  | "ready" // audio loaded; not playing
  | "playing"
  | "paused"
  | "error";

type AudioGetResponse =
  | {
      ok: true;
      status: "ready";
      audioUrl: string;
      durationSec: number;
      voice: string;
    }
  | { ok: true; status: "pending" }
  | { ok: false; status: "failed"; message?: string }
  | { ok: false; status: string; message?: string };

type AudioPostResponse =
  | {
      ok: true;
      status: "ready";
      audioUrl: string;
      durationSec: number;
      voice: string;
    }
  | { ok: true; status: "pending" }
  | { ok: false; status: string; message?: string };

type Props = {
  slug: string;
  title: string;
  /** Match PostShareActions sizing. */
  size?: "sm" | "md";
  className?: string;
};

const SPEEDS = [1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

/** How often to poll GET /audio while a background worker is generating. */
const POLL_INTERVAL_MS = 3000;
/** Hard ceiling so a permanently-stuck PENDING row doesn't poll forever. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * "Play article" button + floating mini-player.
 *
 * Lifecycle:
 *   1. Click Play → GET /audio.
 *      - 200 ready → straight to player.
 *      - 200 pending → another tab/user already kicked off a worker;
 *        start polling.
 *      - 404 missing / 410 stale → POST /generate to claim a worker,
 *        then start polling.
 *      - failed/ineligible → show error.
 *   2. Polling: GET /audio every POLL_INTERVAL_MS until ready or failed.
 *   3. Audio element loads the MP3, then auto-plays.
 *   4. Floating bar appears bottom-right (desktop) / bottom-center
 *      (mobile) with scrub bar + speed + close.
 *   5. Close dismisses the player. State resets on next click.
 */
export function PostAudioPlayer({ slug, title, size = "md", className }: Props) {
  const [status, setStatus] = React.useState<AudioStatus>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [speed, setSpeed] = React.useState<Speed>(1);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  /**
   * Cancellation flag. When the user closes the player mid-generation
   * we want to stop polling immediately rather than letting the loop
   * race with subsequent clicks.
   */
  const cancelledRef = React.useRef(false);

  // Keep playbackRate in sync with state.
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, audioUrl]);

  const isWorking = status === "loading" || status === "generating";

  /**
   * Poll GET /audio until status flips out of `pending`. Resolves with
   * the ready response or throws on failure / timeout / cancellation.
   */
  async function pollUntilReady(): Promise<AudioGetResponse> {
    const startedAt = Date.now();
    while (true) {
      if (cancelledRef.current) {
        throw new Error("cancelled");
      }
      await sleep(POLL_INTERVAL_MS);
      if (cancelledRef.current) {
        throw new Error("cancelled");
      }

      const res = await fetch(`/api/posts/${slug}/audio`, { cache: "no-store" });
      const data = (await res.json()) as AudioGetResponse;

      if (data.ok && data.status === "ready") return data;
      if (!data.ok && data.status === "failed") {
        throw new Error(data.message ?? "Audio generation failed.");
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        throw new Error("Audio generation timed out. Try again.");
      }
      // Otherwise still pending — loop.
    }
  }

  async function fetchOrGenerate(): Promise<AudioGetResponse> {
    // Try cache first.
    const getRes = await fetch(`/api/posts/${slug}/audio`, { cache: "no-store" });
    const getData = (await getRes.json()) as AudioGetResponse;

    if (getRes.ok && getData.ok && getData.status === "ready") {
      return getData;
    }

    if (getRes.ok && getData.ok && getData.status === "pending") {
      // A worker is already running (kicked off by another client). Poll.
      setStatus("generating");
      return pollUntilReady();
    }

    // 404 missing / 410 stale / failed → claim a fresh generation.
    setStatus("generating");
    const postRes = await fetch(`/api/posts/${slug}/audio/generate`, {
      method: "POST",
      cache: "no-store",
    });
    const postData = (await postRes.json()) as AudioPostResponse;

    if (postData.ok && postData.status === "ready") return postData;
    if (postData.ok && postData.status === "pending") return pollUntilReady();
    // Producer-side error (not_configured, ineligible, not_found, etc.).
    return postData as AudioGetResponse;
  }

  async function handlePlay() {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => undefined);
      return;
    }
    cancelledRef.current = false;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const data = await fetchOrGenerate();
      if (cancelledRef.current) return;
      if (!data.ok || data.status !== "ready") {
        setStatus("error");
        const fallback =
          data.status === "ineligible"
            ? "This post is too short to narrate."
            : data.status === "not_configured"
              ? "Audio narration isn't configured on this site."
              : "Couldn't load audio. Try again.";
        setErrorMsg(("message" in data && data.message) || fallback);
        return;
      }
      setAudioUrl(data.audioUrl);
      setDuration(data.durationSec);
      setStatus("ready");
      // Autoplay once the element mounts. Defer to next tick so the ref attaches.
      requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => undefined);
      });
    } catch (err) {
      if (cancelledRef.current) return;
      console.error("audio fetch failed", err);
      setStatus("error");
      setErrorMsg(
        err instanceof Error && err.message !== "cancelled"
          ? err.message
          : "Network error. Try again.",
      );
    }
  }

  function handlePause() {
    audioRef.current?.pause();
  }

  function handleSkip(deltaSec: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + deltaSec),
    );
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    const t = Number(e.target.value);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function handleClose() {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setAudioUrl(null);
    setStatus("idle");
    setCurrentTime(0);
    setDuration(0);
  }

  const buttonSizeClass =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <>
      {/* Trigger button — slots into the share/stats row */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={isWorking}
        aria-label={isWorking ? "Loading audio narration" : "Play article"}
        title="Listen to this article"
        className={[
          "inline-flex items-center gap-1.5 rounded-md border border-white/15 text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60",
          buttonSizeClass,
          className ?? "",
        ].join(" ")}
      >
        {isWorking ? <SpinnerIcon /> : <PlayIcon />}
        <span>{status === "generating" ? "Generating…" : "Listen"}</span>
      </button>

      {/* Inline error toast (lightweight, lives next to the button) */}
      {status === "error" && errorMsg ? (
        <span className="ml-2 text-xs text-red-300/90" role="status">
          {errorMsg}
        </span>
      ) : null}

      {/* Floating player */}
      {audioUrl ? (
        <div
          role="region"
          aria-label="Article audio player"
          className="fixed inset-x-2 bottom-3 z-40 mx-auto max-w-xl rounded-2xl border border-white/15 bg-black/85 px-3 py-2.5 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4"
        >
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setStatus("playing")}
            onPause={() => setStatus("paused")}
            onEnded={() => setStatus("paused")}
          />

          <div className="flex items-center gap-2.5">
            {status === "playing" ? (
              <button
                type="button"
                onClick={handlePause}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
                aria-label="Pause"
              >
                <PauseIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => audioRef.current?.play().catch(() => undefined)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
                aria-label="Play"
              >
                <PlayIcon />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSkip(-15)}
              className="hidden h-7 shrink-0 items-center rounded-md border border-white/15 px-2 text-[10px] text-white/75 hover:bg-white/10 sm:inline-flex"
              aria-label="Skip back 15 seconds"
            >
              −15s
            </button>

            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-xs text-white/85">{title}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="tabular-nums text-[10px] text-white/55">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleScrub}
                  aria-label="Seek"
                  className="h-1 flex-1 cursor-pointer accent-white/85"
                />
                <span className="tabular-nums text-[10px] text-white/55">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSkip(15)}
              className="hidden h-7 shrink-0 items-center rounded-md border border-white/15 px-2 text-[10px] text-white/75 hover:bg-white/10 sm:inline-flex"
              aria-label="Skip forward 15 seconds"
            >
              +15s
            </button>

            <button
              type="button"
              onClick={() => {
                const idx = SPEEDS.indexOf(speed);
                setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
              }}
              className="h-7 shrink-0 rounded-md border border-white/15 px-2 text-[10px] tabular-nums text-white/75 hover:bg-white/10"
              aria-label={`Playback speed ${speed}x`}
              title="Playback speed"
            >
              {speed}×
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/70 hover:bg-white/10"
              aria-label="Close audio player"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- icons (12px stroke, currentColor) ---------- */

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M4 2.5v11l10-5.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <rect x="4" y="3" width="3" height="10" rx="0.5" />
      <rect x="9" y="3" width="3" height="10" rx="0.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      className="animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M8 1.5a6.5 6.5 0 1 1-6.5 6.5" />
    </svg>
  );
}
