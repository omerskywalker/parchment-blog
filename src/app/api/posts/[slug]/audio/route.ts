import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audioPublicUrlVersioned } from "@/lib/server/audioStorage";
import {
  isNarratable,
  markdownToNarrationText,
  prepareNarrationInput,
} from "@/lib/audioText";
import type { StoredSegment } from "@/lib/server/audioPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * If the current narratable text drifts more than this fraction from the
 * stored charCount, treat the cached audio as stale. Small typo fixes
 * shouldn't trigger regeneration; structural rewrites should.
 */
const STALE_DELTA_RATIO = 0.02;

type Params = { params: Promise<{ slug: string }> };

/** Wire shape of one segment exposed to clients. The DB stores `key`
 *  (an S3 object key); we resolve it to a public versioned URL here so
 *  the client never needs to know about S3 layout. */
export type WireSegment = {
  audioUrl: string;
  durationSec: number;
  charCount: number;
  overlapChars: number;
};

/** Coerce the loosely-typed Prisma JSON column into our segment list,
 *  defensively dropping malformed entries rather than throwing — a
 *  bad row would 500 every read otherwise. Returns null when the
 *  column is null/empty so callers fall back to legacy single-file. */
export function decodeStoredSegments(value: unknown): StoredSegment[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: StoredSegment[] = [];
  for (const v of value) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as StoredSegment).key === "string" &&
      typeof (v as StoredSegment).durationSec === "number" &&
      typeof (v as StoredSegment).charCount === "number" &&
      typeof (v as StoredSegment).overlapChars === "number"
    ) {
      out.push(v as StoredSegment);
    }
  }
  return out.length > 0 ? out : null;
}

export function toWireSegments(stored: StoredSegment[]): WireSegment[] {
  return stored.map((s) => ({
    audioUrl: audioPublicUrlVersioned(s.key, s.charCount, s.durationSec),
    durationSec: s.durationSec,
    charCount: s.charCount,
    overlapChars: s.overlapChars,
  }));
}

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      contentMd: true,
      publishedAt: true,
      audio: {
        select: {
          status: true,
          audioKey: true,
          voice: true,
          durationSec: true,
          charCount: true,
          segments: true,
          error: true,
        },
      },
    },
  });

  if (!post || !post.publishedAt) {
    return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
  }

  if (!post.audio) {
    return NextResponse.json({ ok: false, status: "missing" }, { status: 404 });
  }

  // Background worker is still running. Client should poll.
  if (post.audio.status === "PENDING") {
    return NextResponse.json({ ok: true, status: "pending" as const });
  }

  // Background worker hit an error. Surface it so the client can show
  // a useful message and the user can retry.
  if (post.audio.status === "FAILED") {
    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: post.audio.error ?? "Audio generation failed.",
    });
  }

  // status === "READY" from here on. The audio fields should all be
  // populated, but guard defensively in case of a partially-written row.
  if (
    !post.audio.audioKey ||
    post.audio.charCount == null ||
    post.audio.durationSec == null
  ) {
    return NextResponse.json({ ok: false, status: "missing" }, { status: 404 });
  }

  const text = markdownToNarrationText(post.contentMd);
  if (!isNarratable(text)) {
    return NextResponse.json({ ok: false, status: "ineligible" }, { status: 422 });
  }

  // Compare against the SAME truncated slice we'd send to TTS, so long
  // posts (>MAX_NARRATION_CHARS) don't always look stale. See
  // prepareNarrationInput() for rationale.
  const input = prepareNarrationInput(text);

  const drift =
    Math.abs(input.length - post.audio.charCount) /
    Math.max(post.audio.charCount, 1);

  if (drift > STALE_DELTA_RATIO) {
    return NextResponse.json({ ok: false, status: "stale" }, { status: 410 });
  }

  // Prefer the multi-segment payload when present. The legacy
  // audioUrl/durationSec fields stay populated so older clients that
  // ignore `segments` keep working — they'll just play chunk 0 only.
  const stored = decodeStoredSegments(post.audio.segments);
  const segments = stored ? toWireSegments(stored) : null;

  return NextResponse.json({
    ok: true,
    status: "ready" as const,
    audioUrl: audioPublicUrlVersioned(
      post.audio.audioKey,
      post.audio.charCount,
      post.audio.durationSec,
    ),
    durationSec: post.audio.durationSec,
    voice: post.audio.voice,
    segments,
  });
}
