/**
 * Pure helpers for the post-audio mini-player.
 *
 * The player itself (src/app/components/post/PostAudioPlayer.tsx) is a
 * React client component with side effects, refs, and async polling
 * loops. To keep the testable surface large without dragging jsdom
 * into vitest, every piece of logic that doesn't strictly need the
 * DOM lives here as a pure function and is unit-tested in
 * audioPlayer.test.ts.
 */

/* -------------------------------------------------------------------- */
/*  Time formatting                                                      */
/* -------------------------------------------------------------------- */

/**
 * Format a number of seconds as `M:SS`. Handles NaN, Infinity, negative
 * input, and very long durations gracefully — these all show up in real
 * audio elements before metadata loads or after errors.
 */
export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* -------------------------------------------------------------------- */
/*  Speed cycling                                                        */
/* -------------------------------------------------------------------- */

export const SPEEDS = [1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * Cycle through SPEEDS in a loop. Defensive against stale state where
 * `current` isn't in the list (e.g. after we add/remove a speed in a
 * future release) — falls back to the first speed.
 */
export function nextSpeed(current: Speed, list: readonly Speed[] = SPEEDS): Speed {
  const idx = list.indexOf(current);
  if (idx === -1) return list[0];
  return list[(idx + 1) % list.length];
}

/* -------------------------------------------------------------------- */
/*  Per-slug playback position persistence                               */
/* -------------------------------------------------------------------- */

const POSITION_KEY_PREFIX = "pb-audio-pos:";
/** Don't restore a saved position from the very tail — feels broken. */
const TAIL_GUARD_SEC = 5;
/** Don't bother saving sub-second positions; not worth the localStorage churn. */
const SAVE_THRESHOLD_SEC = 2;

export function positionKey(slug: string): string {
  return `${POSITION_KEY_PREFIX}${slug}`;
}

/**
 * Persist a playback position. No-op if storage is unavailable or the
 * position is too small to bother with.
 */
export function saveAudioPosition(
  slug: string,
  positionSec: number,
  storage: Pick<Storage, "setItem"> | null = safeLocalStorage(),
): void {
  if (!storage) return;
  if (!Number.isFinite(positionSec) || positionSec < SAVE_THRESHOLD_SEC) return;
  try {
    storage.setItem(positionKey(slug), String(Math.floor(positionSec)));
  } catch {
    /* ignore — quota / private mode */
  }
}

/**
 * Load a previously-persisted position. Returns 0 if nothing's stored,
 * if the value is corrupt, or if the saved position is within
 * TAIL_GUARD_SEC of the duration (in which case starting from the top
 * is the better experience).
 */
export function loadAudioPosition(
  slug: string,
  durationSec: number,
  storage: Pick<Storage, "getItem"> | null = safeLocalStorage(),
): number {
  if (!storage) return 0;
  let raw: string | null = null;
  try {
    raw = storage.getItem(positionKey(slug));
  } catch {
    return 0;
  }
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (Number.isFinite(durationSec) && durationSec > 0 && n >= durationSec - TAIL_GUARD_SEC) {
    return 0;
  }
  return n;
}

export function clearAudioPosition(
  slug: string,
  storage: Pick<Storage, "removeItem"> | null = safeLocalStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(positionKey(slug));
  } catch {
    /* ignore */
  }
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- */
/*  Polling state machine                                                */
/* -------------------------------------------------------------------- */

/** Subset of the GET /api/posts/:slug/audio response shape we care about. */
export type PollResponse =
  | { ok: true; status: "ready"; audioUrl: string; durationSec: number }
  | { ok: true; status: "pending" }
  | { ok: false; status: "failed"; message?: string }
  | { ok: false; status: string; message?: string };

export type PollDecision =
  | { kind: "ready"; audioUrl: string; durationSec: number }
  | { kind: "continue" }
  | { kind: "failed"; message: string }
  | { kind: "timeout" };

/**
 * Single source of truth for "what should the polling loop do next?".
 * Extracted so we can exhaustively test every branch in isolation.
 *
 * @param response  Parsed JSON body from GET /audio.
 * @param elapsedMs How long polling has been running so far.
 * @param timeoutMs The hard ceiling. If elapsedMs > timeoutMs, we stop.
 */
export function pollDecision(
  response: PollResponse,
  elapsedMs: number,
  timeoutMs: number,
): PollDecision {
  if (response.ok && response.status === "ready") {
    return {
      kind: "ready",
      audioUrl: response.audioUrl,
      durationSec: response.durationSec,
    };
  }
  if (!response.ok && response.status === "failed") {
    return { kind: "failed", message: response.message ?? "Audio generation failed." };
  }
  if (elapsedMs > timeoutMs) {
    return { kind: "timeout" };
  }
  // pending or any other transient — keep polling.
  return { kind: "continue" };
}

/* -------------------------------------------------------------------- */
/*  "Generating…" copy                                                   */
/* -------------------------------------------------------------------- */

/**
 * Animate the trailing dots of "Generating" so the user has a visible
 * heartbeat during the 30–60s gap. Returns 0..3 dots based on how long
 * generation has been running.
 */
export function generatingDots(elapsedMs: number): string {
  const stage = Math.floor(elapsedMs / 400) % 4;
  return ".".repeat(stage);
}

/**
 * Show a duration hint after the user has been waiting long enough to
 * worry it might be stuck. Returns null below the threshold so the UI
 * can render nothing.
 */
export function generatingHint(elapsedMs: number, thresholdMs = 20_000): string | null {
  if (elapsedMs < thresholdMs) return null;
  return "long posts can take ~30s";
}
