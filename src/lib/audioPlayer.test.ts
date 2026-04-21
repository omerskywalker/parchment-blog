import { describe, it, expect, beforeEach } from "vitest";
import {
  formatTime,
  nextSpeed,
  SPEEDS,
  positionKey,
  saveAudioPosition,
  loadAudioPosition,
  clearAudioPosition,
  pollDecision,
  generatingDots,
  generatingHint,
  type PollResponse,
  type Speed,
} from "./audioPlayer";

/* ------------------------------------------------------------------ */
/*  formatTime                                                         */
/* ------------------------------------------------------------------ */

describe("formatTime", () => {
  it("formats seconds under a minute with leading zero", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(7)).toBe("0:07");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats minutes correctly", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(125)).toBe("2:05");
  });

  it("handles long durations (10+ min articles)", () => {
    expect(formatTime(60 * 35 + 12)).toBe("35:12");
  });

  it("floors fractional seconds (no '0:7.5')", () => {
    expect(formatTime(7.9)).toBe("0:07");
  });

  it("returns 0:00 for NaN, Infinity, and negatives — common audio-element edge cases", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});

/* ------------------------------------------------------------------ */
/*  nextSpeed                                                          */
/* ------------------------------------------------------------------ */

describe("nextSpeed", () => {
  it("cycles through the canonical speed list", () => {
    expect(nextSpeed(1)).toBe(1.25);
    expect(nextSpeed(1.25)).toBe(1.5);
    expect(nextSpeed(1.5)).toBe(2);
  });

  it("wraps from the last speed back to the first", () => {
    expect(nextSpeed(2)).toBe(1);
  });

  it("falls back to the first speed if current isn't in the list (forward-compatible)", () => {
    expect(nextSpeed(3 as unknown as Speed)).toBe(1);
  });

  it("uses the canonical SPEEDS list by default", () => {
    expect(SPEEDS).toEqual([1, 1.25, 1.5, 2]);
  });
});

/* ------------------------------------------------------------------ */
/*  Position persistence                                               */
/* ------------------------------------------------------------------ */

function makeStorage(): Storage & { _data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    _data: data,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    key: (i) => Array.from(data.keys())[i] ?? null,
  };
}

describe("positionKey", () => {
  it("namespaces per slug so two posts don't collide", () => {
    expect(positionKey("foo")).not.toBe(positionKey("bar"));
    expect(positionKey("foo")).toMatch(/foo$/);
  });
});

describe("saveAudioPosition", () => {
  let storage: ReturnType<typeof makeStorage>;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("persists positions ≥ 2s", () => {
    saveAudioPosition("post-a", 12.7, storage);
    expect(storage.getItem(positionKey("post-a"))).toBe("12");
  });

  it("ignores sub-2s positions (not worth the storage churn)", () => {
    saveAudioPosition("post-a", 1.5, storage);
    expect(storage.getItem(positionKey("post-a"))).toBeNull();
  });

  it("ignores NaN / Infinity / negative", () => {
    saveAudioPosition("post-a", NaN, storage);
    saveAudioPosition("post-a", Infinity, storage);
    saveAudioPosition("post-a", -7, storage);
    expect(storage.getItem(positionKey("post-a"))).toBeNull();
  });

  it("is a no-op when storage is null (SSR / private mode)", () => {
    expect(() => saveAudioPosition("post-a", 30, null)).not.toThrow();
  });

  it("swallows storage exceptions (quota exceeded, private mode)", () => {
    const bad = {
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(() => saveAudioPosition("post-a", 30, bad)).not.toThrow();
  });
});

describe("loadAudioPosition", () => {
  let storage: ReturnType<typeof makeStorage>;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("returns 0 when nothing is stored", () => {
    expect(loadAudioPosition("post-a", 600, storage)).toBe(0);
  });

  it("returns the stored value when in range", () => {
    storage.setItem(positionKey("post-a"), "120");
    expect(loadAudioPosition("post-a", 600, storage)).toBe(120);
  });

  it("returns 0 when the stored position is within the tail guard (avoid 'starts at the end')", () => {
    storage.setItem(positionKey("post-a"), "598"); // duration 600, guard 5
    expect(loadAudioPosition("post-a", 600, storage)).toBe(0);
  });

  it("returns the value when duration is unknown (caller can clamp later)", () => {
    storage.setItem(positionKey("post-a"), "999");
    expect(loadAudioPosition("post-a", 0, storage)).toBe(999);
  });

  it("returns 0 for corrupted / non-numeric values", () => {
    storage.setItem(positionKey("post-a"), "garbage");
    expect(loadAudioPosition("post-a", 600, storage)).toBe(0);
  });

  it("returns 0 for negative stored values", () => {
    storage.setItem(positionKey("post-a"), "-3");
    expect(loadAudioPosition("post-a", 600, storage)).toBe(0);
  });

  it("returns 0 when storage is null", () => {
    expect(loadAudioPosition("post-a", 600, null)).toBe(0);
  });

  it("returns 0 when storage throws", () => {
    const bad = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadAudioPosition("post-a", 600, bad)).toBe(0);
  });
});

describe("clearAudioPosition", () => {
  it("removes the stored entry", () => {
    const s = makeStorage();
    s.setItem(positionKey("post-a"), "30");
    clearAudioPosition("post-a", s);
    expect(s.getItem(positionKey("post-a"))).toBeNull();
  });

  it("is a no-op for null storage and never throws", () => {
    expect(() => clearAudioPosition("post-a", null)).not.toThrow();
  });

  it("swallows removeItem exceptions", () => {
    const bad = {
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => clearAudioPosition("post-a", bad)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  pollDecision — exhaustive branch coverage                         */
/* ------------------------------------------------------------------ */

describe("pollDecision", () => {
  const TIMEOUT = 60_000;

  it("returns ready with the audio URL when status=ready", () => {
    const r: PollResponse = { ok: true, status: "ready", audioUrl: "/x.mp3", durationSec: 90 };
    expect(pollDecision(r, 1000, TIMEOUT)).toEqual({
      kind: "ready",
      audioUrl: "/x.mp3",
      durationSec: 90,
    });
  });

  it("returns failed (with message) when status=failed", () => {
    const r: PollResponse = { ok: false, status: "failed", message: "TTS quota" };
    expect(pollDecision(r, 1000, TIMEOUT)).toEqual({
      kind: "failed",
      message: "TTS quota",
    });
  });

  it("returns failed with default message when no message provided", () => {
    const r: PollResponse = { ok: false, status: "failed" };
    expect(pollDecision(r, 1000, TIMEOUT)).toEqual({
      kind: "failed",
      message: "Audio generation failed.",
    });
  });

  it("returns continue while pending and within the timeout window", () => {
    const r: PollResponse = { ok: true, status: "pending" };
    expect(pollDecision(r, 5_000, TIMEOUT)).toEqual({ kind: "continue" });
  });

  it("returns timeout once elapsed exceeds the timeout window", () => {
    const r: PollResponse = { ok: true, status: "pending" };
    expect(pollDecision(r, TIMEOUT + 1, TIMEOUT)).toEqual({ kind: "timeout" });
  });

  it("treats unknown transient statuses as 'continue' (forward-compatible)", () => {
    const r: PollResponse = { ok: false, status: "queued" };
    expect(pollDecision(r, 1000, TIMEOUT)).toEqual({ kind: "continue" });
  });

  it("prefers ready over a stale timeout — racing the clock should still serve the result", () => {
    const r: PollResponse = { ok: true, status: "ready", audioUrl: "/x.mp3", durationSec: 10 };
    expect(pollDecision(r, TIMEOUT + 999_999, TIMEOUT).kind).toBe("ready");
  });
});

/* ------------------------------------------------------------------ */
/*  Generating UI helpers                                              */
/* ------------------------------------------------------------------ */

describe("generatingDots", () => {
  it("cycles through 0..3 dots over time", () => {
    expect(generatingDots(0)).toBe("");
    expect(generatingDots(400)).toBe(".");
    expect(generatingDots(800)).toBe("..");
    expect(generatingDots(1200)).toBe("...");
    expect(generatingDots(1600)).toBe(""); // wraps
  });
});

describe("generatingHint", () => {
  it("returns null below the threshold (don't pre-worry the user)", () => {
    expect(generatingHint(0)).toBeNull();
    expect(generatingHint(19_999)).toBeNull();
  });

  it("returns a hint at or past the threshold", () => {
    expect(generatingHint(20_000)).toContain("~30s");
    expect(generatingHint(45_000)).toContain("~30s");
  });

  it("threshold is configurable", () => {
    expect(generatingHint(5_000, 10_000)).toBeNull();
    expect(generatingHint(10_000, 10_000)).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-helper integration sanity                                    */
/* ------------------------------------------------------------------ */

describe("integration: save then load round-trip", () => {
  it("save → load returns the persisted position (modulo flooring)", () => {
    const s = makeStorage();
    saveAudioPosition("post-a", 47.6, s);
    expect(loadAudioPosition("post-a", 600, s)).toBe(47);
  });

  it("clear after save → load returns 0", () => {
    const s = makeStorage();
    saveAudioPosition("post-a", 47, s);
    clearAudioPosition("post-a", s);
    expect(loadAudioPosition("post-a", 600, s)).toBe(0);
  });
});
