import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  claimAudioGeneration,
  runAudioGeneration,
} from "@/lib/server/audioPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Vercel keeps the function warm for `maxDuration` seconds total —
 * including any work scheduled with `after()`. Each TTS run takes
 * ~30-60s so 5 minutes is enough headroom for the per-run cap of
 * BACKFILL_LIMIT generations executing with a small concurrency.
 */
export const maxDuration = 300;

/** Max posts queued per cron run. Keeps OpenAI cost + function time
 *  predictable. Backlog larger than this rolls over to tomorrow. */
const BACKFILL_LIMIT = 5;
/** Window that the cron sweeps each run. */
const LOOKBACK_DAYS = 7;

/**
 * GET /api/cron/audio-backfill
 *
 * Daily safety net for the on-publish hook. Finds posts published in
 * the last LOOKBACK_DAYS that don't yet have READY audio (missing
 * row, FAILED, or never-claimed) and enqueues TTS for them.
 *
 * Authed via CRON_SECRET — Vercel injects an Authorization: Bearer
 * <secret> header when the route is configured in vercel.json.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");

  // In CI (no CRON_SECRET) we let the request through so build/test
  // pipelines exercise the route; production always enforces.
  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Candidates: published in window AND audio is missing, FAILED, or
  // (rarely) stuck PENDING from a crashed previous run we want to retry.
  // We exclude PENDING here intentionally — let it stay claimed unless
  // the previous run truly died, which is impossible to detect cheaply.
  const candidates = await prisma.post.findMany({
    where: {
      publishedAt: { not: null, gte: since },
      OR: [
        { audio: null },
        { audio: { status: "FAILED" } },
      ],
    },
    select: { id: true, slug: true },
    orderBy: { publishedAt: "desc" }, // newest first — most likely to be read
    take: BACKFILL_LIMIT,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, scanned: 0 });
  }

  // Claim synchronously so we know how many we'll actually run; then
  // hand the slow TTS work to after() so the response flushes fast.
  const claimed: Array<{ postId: string; input: string; slug: string }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  for (const c of candidates) {
    const result = await claimAudioGeneration(c.slug);
    if (result.kind === "claimed") {
      claimed.push({ postId: result.postId, input: result.input, slug: c.slug });
    } else {
      skipped.push({ slug: c.slug, reason: result.kind });
    }
  }

  if (claimed.length > 0) {
    after(async () => {
      // Run with small concurrency. Promise.allSettled so one failure
      // doesn't take the rest down — runAudioGeneration also persists
      // FAILED on any error, so logging is the only extra signal.
      const results = await Promise.allSettled(
        claimed.map((c) => runAudioGeneration(c.postId, c.input)),
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.error(
          `[cron/audio-backfill] ${failures.length}/${claimed.length} generations rejected`,
        );
      }
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    queued: claimed.length,
    skipped,
  });
}
