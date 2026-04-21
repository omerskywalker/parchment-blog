"use client";

import * as React from "react";
import { track } from "@vercel/analytics";
import {
  formatTime,
  nextSpeed,
  type Speed,
  loadAudioPosition,
  saveAudioPosition,
  clearAudioPosition,
  pollDecision,
  generatingDots,
  generatingHint,
  type PollResponse,
} from "@/lib/audioPlayer";

type AudioStatus =
  | "idle"
  | "loading" // initial GET in flight
  | "generating" // POST kicked off + polling for ready
  | "ready" // audio loaded; not playing
  | "playing"
  | "paused"
  | "error";

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
  /** Match PostShareActions / PostStatsBar sizing. */
  size?: "sm" | "md";
  className?: string;
};

/** How often to poll GET /audio while a background worker is generating. */
const POLL_INTERVAL_MS = 3000;
/** Hard ceiling so a permanently-stuck PENDING row doesn't poll forever. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
/** Throttle: how often to persist the playback position. */
const POSITION_SAVE_INTERVAL_MS = 5_000;
/**
 * Tiny silent WAV (0.05s, 8kHz mono 8-bit, ~592 chars b64). Played
 * synchronously inside the click handler to consume the user-gesture
 * grant on the actual <audio> element so a later play() — after the
 * 30–60s generation window — is allowed by Safari/iOS. An empty-src
 * play() does NOT count as user-activation on WebKit; only a real,
 * decodable source does.
 */
const SILENT_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

/** Refresh cadence for the animated "Generating…" dots + hint. */
const GENERATING_TICK_MS = 400;

/** Body class added when the player is on screen so the article doesn't get
 * eaten by the fixed bar. Defined inline so we don't have to round-trip
 * through globals.css for one rule — Tailwind utility on body works fine. */
const BODY_PADDED_CLASS = "pb-audio-padded";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * "Listen" trigger button + floating mini-player.
 *
 * See the dedicated audioPlayer.ts module for pure logic (formatting,
 * polling decisions, position persistence). This file owns:
 *   - the React state machine,
 *   - DOM-bound side effects (audio element, keyboard, body padding),
 *   - the user-gesture priming required for autoplay.
 */
export function PostAudioPlayer({ slug, title, size = "md", className }: Props) {
  const [status, setStatus] = React.useState<AudioStatus>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [speed, setSpeed] = React.useState<Speed>(1);
  const [minimized, setMinimized] = React.useState(false);
  /** When generation started; drives the animated dots + delayed hint. */
  const [genStartedAt, setGenStartedAt] = React.useState<number | null>(null);
  /** Forces a re-render every GENERATING_TICK_MS so dots animate. */
  const [genTick, setGenTick] = React.useState(0);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  /**
   * Generation counter — every handlePlay/handleClose increments it.
   * The polling loop captures the value at start and bails the
   * moment the live ref no longer matches. This makes cancellation
   * race-free: rapid Close → Listen sequences can't leak old loops.
   */
  const generationRef = React.useRef(0);
  /**
   * Tracks whether we've consumed a user-gesture grant on the audio
   * element. Once true, .play() can be called from async contexts and
   * still be honoured by Chromium/Firefox (Safari is stricter).
   */
  const gesturePrimedRef = React.useRef(false);
  /** Last time we persisted position — throttle saves to once per N ms. */
  const lastPositionSaveRef = React.useRef(0);
  /** Whether we've fired the analytics 'start' event for this URL. */
  const trackedStartRef = React.useRef<string | null>(null);

  // Keep playbackRate in sync with state.
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, audioUrl]);

  // (D) While generating, tick state so dots + hint refresh on screen.
  React.useEffect(() => {
    if (status !== "generating") return;
    const id = window.setInterval(() => setGenTick((n) => n + 1), GENERATING_TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  // (C) Pad the bottom of <body> when the player is visible so the
  // floating bar doesn't cover the last paragraph of the article.
  React.useEffect(() => {
    if (!audioUrl) return;
    const body = document.body;
    body.classList.add(BODY_PADDED_CLASS);
    // Inline style is more robust than depending on a Tailwind util that
    // may or may not be tree-shaken into the CSS bundle.
    const previous = body.style.paddingBottom;
    body.style.paddingBottom = "6.5rem";
    return () => {
      body.classList.remove(BODY_PADDED_CLASS);
      body.style.paddingBottom = previous;
    };
  }, [audioUrl]);

  // (B) Keyboard shortcuts while a player is open: space toggles,
  // arrows skip ±15s. Ignored when typing in form fields so we don't
  // hijack the seek-bar's keyboard interactions.
  React.useEffect(() => {
    if (!audioUrl) return;
    function isFormField(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      // Range slider lives inside the player itself — let it handle its own keys.
      if (el instanceof HTMLInputElement && el.type === "range") return true;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (isFormField(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => undefined);
        else el.pause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipBy(-15);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipBy(15);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // skipBy / handlers reach for refs, no closure issue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const isWorking = status === "loading" || status === "generating";

  /**
   * Poll GET /audio until status flips out of `pending`. Captures the
   * generation counter at start; bails the moment a newer click
   * supersedes it.
   */
  async function pollUntilReady(generation: number): Promise<PollResponse> {
    const startedAt = Date.now();
    while (true) {
      if (generationRef.current !== generation) {
        throw new Error("cancelled");
      }
      await sleep(POLL_INTERVAL_MS);
      if (generationRef.current !== generation) {
        throw new Error("cancelled");
      }

      const res = await fetch(`/api/posts/${slug}/audio`, { cache: "no-store" });
      const data = (await res.json()) as PollResponse;

      const decision = pollDecision(data, Date.now() - startedAt, POLL_TIMEOUT_MS);
      switch (decision.kind) {
        case "ready":
          return data;
        case "failed":
          throw new Error(decision.message);
        case "timeout":
          throw new Error("Audio generation timed out. Try again.");
        case "continue":
          continue;
      }
    }
  }

  async function fetchOrGenerate(generation: number): Promise<PollResponse> {
    // Try cache first.
    const getRes = await fetch(`/api/posts/${slug}/audio`, { cache: "no-store" });
    const getData = (await getRes.json()) as PollResponse;

    if (getRes.ok && getData.ok && getData.status === "ready") {
      return getData;
    }

    if (getRes.ok && getData.ok && getData.status === "pending") {
      // A worker is already running (kicked off by another client). Poll.
      setStatus("generating");
      setGenStartedAt(Date.now());
      return pollUntilReady(generation);
    }

    // 404 missing / 410 stale / failed → claim a fresh generation.
    setStatus("generating");
    setGenStartedAt(Date.now());
    const postRes = await fetch(`/api/posts/${slug}/audio/generate`, {
      method: "POST",
      cache: "no-store",
    });
    const postData = (await postRes.json()) as AudioPostResponse;

    if (postData.ok && postData.status === "ready") return postData;
    if (postData.ok && postData.status === "pending") return pollUntilReady(generation);
    return postData as PollResponse;
  }

  /**
   * Synchronously consume the click's user-gesture grant so the
   * <audio> element is allowed to start playback later, after the
   * async fetch/poll completes. Browsers gate autoplay behind a
   * recent user activation; without this trick, by the time the MP3
   * URL arrives 30–60s later, the gesture has expired and play()
   * silently rejects with NotAllowedError.
   */
  function primeGesture() {
    const el = audioRef.current;
    if (!el) return;
    if (gesturePrimedRef.current) return; // Already unlocked for the page.
    try {
      // Mute so the silent sample is doubly inaudible — and so even if a
      // codec quirk emits a click, the user never hears it.
      el.muted = true;
      el.src = SILENT_AUDIO_DATA_URL;
      el.load();
      const p = el.play();
      // Tag as primed regardless — once we've issued a play() inside a
      // gesture WebKit/Chromium will allow subsequent ones.
      gesturePrimedRef.current = true;
      if (p && typeof p.then === "function") {
        p.then(
          () => {
            // Stop the silent loop immediately; we just needed the
            // activation, not actual playback.
            try {
              el.pause();
              el.muted = false;
            } catch {
              /* ignore */
            }
          },
          () => {
            // Even on rejection (rare for a valid data URL), the gesture
            // has been consumed for this element. Restore unmuted state.
            try {
              el.muted = false;
            } catch {
              /* ignore */
            }
          },
        );
      }
    } catch {
      /* ignore — non-fatal; user can tap the visible play button */
    }
  }

  function skipBy(deltaSec: number) {
    const el = audioRef.current;
    if (!el) return;
    const max = duration || el.duration || 0;
    el.currentTime = Math.max(0, Math.min(max || el.currentTime + deltaSec, el.currentTime + deltaSec));
  }

  async function handlePlay() {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => undefined);
      return;
    }

    // Must run BEFORE any await so we're still inside the gesture.
    primeGesture();

    // (E) Bump the generation counter; any in-flight loop sees the
    // change on its next checkpoint and bails out cleanly.
    const generation = ++generationRef.current;

    setStatus("loading");
    setErrorMsg(null);
    try {
      const data = await fetchOrGenerate(generation);
      if (generationRef.current !== generation) return;
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
      setGenStartedAt(null);
      // Autoplay once the src lands on the element. Defer to next tick
      // so React commits the new src attribute before play() is called.
      requestAnimationFrame(() => {
        if (generationRef.current !== generation) return;
        const el = audioRef.current;
        if (!el) return;
        el.playbackRate = speed;
        // (A) Restore previous position if available.
        const saved = loadAudioPosition(slug, data.durationSec);
        if (saved > 0) el.currentTime = saved;
        el.play().catch(() => {
          // Safari / activation expired — user can tap the visible
          // play button on the now-glowing player. No error UI.
        });
      });
    } catch (err) {
      if (generationRef.current !== generation) return;
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

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    const t = Number(e.target.value);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function handleClose() {
    // Bumping generation cancels any in-flight loop without races.
    generationRef.current += 1;
    if (audioRef.current) {
      // Persist final position before silencing — user might re-open.
      saveAudioPosition(slug, audioRef.current.currentTime);
      audioRef.current.pause();
    }
    // Keep gesturePrimedRef true — once primed, stays primed for the
    // life of the page so reopening doesn't require re-priming.
    setAudioUrl(null);
    setStatus("idle");
    setCurrentTime(0);
    setDuration(0);
    setMinimized(false);
    setGenStartedAt(null);
  }

  /**
   * Trigger button styling — matches the Fire/Copy/Post/Share buttons
   * in PostStatsBar + PostShareActions so the action row reads as one
   * coherent group rather than a stack of mismatched pills.
   */
  const triggerHeight = "h-10";
  // Press feedback: hover lifts +1px, active drops back AND scales to
  // 0.97 with a stronger background — gives a satisfying "press down"
  // tactile feel that matches the fire/copy/share buttons but is a
  // touch more pronounced because Listen is the primary action here.
  const triggerBase =
    `${triggerHeight} inline-flex items-center justify-center gap-2 ` +
    `rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white/85 ` +
    `transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 ` +
    `hover:bg-black/45 hover:border-white/25 hover:-translate-y-[1px] ` +
    `active:translate-y-0 active:scale-[0.97] active:bg-black/55 active:border-white/30 ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ` +
    `disabled:opacity-60 disabled:hover:translate-y-0 disabled:active:scale-100 ` +
    `cursor-pointer`;
  const triggerPad = size === "sm" ? "px-3.5" : "px-4";

  // (D) Compute the "Generating…" copy fresh on each render. The
  // genTick state increments every GENERATING_TICK_MS while polling,
  // forcing this re-evaluation so dots animate and the hint appears.
  const genElapsed =
    genStartedAt !== null ? Date.now() - genStartedAt + genTick * 0 : 0;
  const dots = status === "generating" ? generatingDots(genElapsed) : "";
  const hint = status === "generating" ? generatingHint(genElapsed) : null;

  return (
    <>
      {/* Always-mounted <audio>. See note in the original change for the
          rAF/useEffect race that motivates `src` as a JSX prop. */}
      <audio
        ref={audioRef}
        preload="none"
        hidden={!audioUrl}
        src={audioUrl ?? undefined}
        onLoadedMetadata={(e) => {
          // Skip metadata events from the silent-prime audio — its
          // 0.05s duration would briefly clobber the real value.
          if (!audioUrl) return;
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          if (!audioUrl) return; // ignore prime-audio ticks
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          // (A) Throttled save — once every POSITION_SAVE_INTERVAL_MS.
          const now = Date.now();
          if (now - lastPositionSaveRef.current >= POSITION_SAVE_INTERVAL_MS) {
            lastPositionSaveRef.current = now;
            saveAudioPosition(slug, t);
          }
        }}
        onPlay={() => {
          // The silent-audio gesture-priming play() also fires this
          // event. Gate everything behind the presence of a real URL.
          if (!audioUrl) return;
          setStatus("playing");
          // (H) Fire 'start' once per audio URL — not every play/pause.
          if (trackedStartRef.current !== audioUrl) {
            trackedStartRef.current = audioUrl;
            try {
              track("audio_listen_start", { slug });
            } catch {
              /* analytics never blocks playback */
            }
          }
        }}
        onPause={() => {
          if (!audioUrl) return;
          setStatus("paused");
        }}
        onEnded={() => {
          setStatus("paused");
          // (A) Listened to the end → don't restore from the tail next time.
          clearAudioPosition(slug);
          // (H) Completion event.
          try {
            track("audio_listen_complete", { slug });
          } catch {
            /* ignore */
          }
        }}
      />

      {/* Trigger button — slots into the share/stats row */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={isWorking}
        aria-label={isWorking ? "Loading audio narration" : "Play article"}
        title="Listen to this article"
        className={[triggerBase, triggerPad, className ?? ""].join(" ")}
      >
        {isWorking ? <SpinnerIcon /> : <PlayIcon />}
        {status === "generating" ? (
          // Pin "Generating" in place; the dots get a fixed-width
          // left-aligned slot so adding/removing one doesn't shift the
          // rest of the label. Without this, justify-center recentres
          // the whole label on every animation frame.
          <span className="inline-flex items-baseline">
            <span>Generating</span>
            <span
              aria-hidden="true"
              className="ml-px inline-block w-3 text-left tabular-nums"
            >
              {dots}
            </span>
          </span>
        ) : (
          <span>Listen</span>
        )}
      </button>

      {/* Inline error toast (lightweight, lives next to the button) */}
      {status === "error" && errorMsg ? (
        <span className="ml-2 text-xs text-red-300/90" role="status">
          {errorMsg}
        </span>
      ) : null}

      {/* (D) Long-wait hint — appears after 20s under the button */}
      {hint ? (
        <span className="ml-2 text-[11px] text-white/55" role="status">
          {hint}
        </span>
      ) : null}

      {/* Floating player */}
      {audioUrl ? (
        minimized ? (
          // The minimized bubble's primary action is play/pause —
          // matches the icon shown. Expanding lives on a small caret
          // in the corner so it's discoverable but doesn't steal the
          // tap target. Tapping the icon was previously expanding the
          // player which felt completely wrong: an obvious play/pause
          // button that doesn't play or pause.
          <div
            className={[
              "fixed bottom-3 right-3 z-40",
              "pb-player-glow rounded-full",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => {
                const el = audioRef.current;
                if (!el) return;
                if (el.paused) el.play().catch(() => undefined);
                else el.pause();
              }}
              aria-label={status === "playing" ? "Pause" : "Play"}
              title={status === "playing" ? "Pause" : "Play"}
              className={[
                "flex h-12 w-12 items-center justify-center",
                "rounded-full border border-white/15 bg-black/85 text-white backdrop-blur",
                "transition-transform duration-150",
                "active:scale-[0.93] hover:bg-black/90",
                "cursor-pointer",
              ].join(" ")}
            >
              {status === "playing" ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={() => setMinimized(false)}
              aria-label="Expand audio player"
              title="Expand"
              className={[
                "absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center",
                "rounded-full border border-white/20 bg-black text-white/85",
                "transition-transform duration-150 hover:scale-110 active:scale-95",
                "cursor-pointer",
              ].join(" ")}
            >
              <ExpandIcon />
            </button>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Article audio player"
            className={[
              "fixed inset-x-2 bottom-3 z-40 mx-auto max-w-xl rounded-2xl",
              "border border-white/15 bg-black/85 px-3 py-2.5 backdrop-blur",
              "sm:inset-x-auto sm:right-4",
              "pb-player-glow",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              {status === "playing" ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
                  aria-label="Pause (space)"
                  title="Pause (space)"
                >
                  <PauseIcon />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => audioRef.current?.play().catch(() => undefined)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
                  aria-label="Play (space)"
                  title="Play (space)"
                >
                  <PlayIcon />
                </button>
              )}

              <button
                type="button"
                onClick={() => skipBy(-15)}
                className="hidden h-7 shrink-0 items-center rounded-md border border-white/15 px-2 text-[10px] text-white/75 hover:bg-white/10 sm:inline-flex"
                aria-label="Skip back 15 seconds (←)"
                title="Skip back 15s (←)"
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
                onClick={() => skipBy(15)}
                className="hidden h-7 shrink-0 items-center rounded-md border border-white/15 px-2 text-[10px] text-white/75 hover:bg-white/10 sm:inline-flex"
                aria-label="Skip forward 15 seconds (→)"
                title="Skip forward 15s (→)"
              >
                +15s
              </button>

              <button
                type="button"
                onClick={() => setSpeed((s) => nextSpeed(s))}
                className="h-7 shrink-0 rounded-md border border-white/15 px-2 text-[10px] tabular-nums text-white/75 hover:bg-white/10"
                aria-label={`Playback speed ${speed}x`}
                title="Playback speed"
              >
                {speed}×
              </button>

              {/* (F) Minimize collapses the player to a draggable-looking
                  bubble so power-listeners can hide it without losing
                  position or playback. */}
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/70 hover:bg-white/10"
                aria-label="Minimize audio player"
                title="Minimize"
              >
                <MinimizeIcon />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/70 hover:bg-white/10"
                aria-label="Close audio player"
                title="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        )
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

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="9"
      height="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Two arrows pointing outward — universal "expand" affordance */}
      <path d="M3 7V3h4M13 9v4H9" />
    </svg>
  );
}

function MinimizeIcon() {
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
      <path d="M3 12h10" />
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
