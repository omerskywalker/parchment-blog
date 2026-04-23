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
/** Hard ceiling on `?limit=N` for operator-triggered force runs.
 *  Even with auth we don't want a typo to spawn 1000 TTS jobs. */
const FORCE_LIMIT_MAX = 50;
/** Window that the cron sweeps each run (normal mode). Force mode
 *  ignores this entirely and considers every published post. */
const LOOKBACK_DAYS = 7;

/**
 * GET /api/cron/audio-backfill
 *
 * Daily safety net for the on-publish hook. Finds posts published in
 * the last LOOKBACK_DAYS that don't yet have READY audio (missing
 * row, FAILED, or never-claimed) and enqueues TTS for them.
 *
 * Authed via CRON_SECRET — Vercel injects an Authorization: Bearer
 * <secret> header when the route is configured in vercel.json. The
 * same Bearer token gates the optional `?force=1` flag, which
 * widens the sweep to ALL published posts and bypasses the cache /
 * in-flight checks for each one. Used to manually re-trigger
 * generation after a chunker or pipeline change:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://parchment.blog/api/cron/audio-backfill?force=1&limit=20"
 *
 * Without `?force=1`, we accept the request from any caller in dev
 * (no CRON_SECRET set) so build/test pipelines exercise the route;
 * `?force=1` ALWAYS requires Bearer auth, even in dev, because it
 * burns real OpenAI quota.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");
  const isAuthenticated =
    !!cronSecret && authorization === `Bearer ${cronSecret}`;

  if (cronSecret && !isAuthenticated) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const wantForce = url.searchParams.get("force") === "1";
  if (wantForce && !isAuthenticated) {
    // Force regen requires hard auth even in CI/dev — it spends $.
    return NextResponse.json(
      { ok: false, error: "Force requires Authorization: Bearer <CRON_SECRET>" },
      { status: 401 },
    );
  }

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = wantForce
    ? Math.min(
        Math.max(Number.isFinite(limitParam) && limitParam > 0 ? limitParam : BACKFILL_LIMIT, 1),
        FORCE_LIMIT_MAX,
      )
    : BACKFILL_LIMIT;

  // Candidate set:
  //   - normal mode: posts published in the last LOOKBACK_DAYS days
  //     whose audio is missing or FAILED.
  //   - force mode: every published post, regardless of status. The
  //     pipeline's claim() runs with `force: true` so READY rows get
  //     overwritten and any leftover PENDING claims (from a crashed
  //     run) get re-claimed.
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.post.findMany({
    where: wantForce
      ? { publishedAt: { not: null } }
      : {
          publishedAt: { not: null, gte: since },
          OR: [{ audio: null }, { audio: { status: "FAILED" } }],
        },
    select: { id: true, slug: true },
    orderBy: { publishedAt: "desc" }, // newest first — most likely to be read
    take: limit,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, scanned: 0, force: wantForce });
  }

  // Claim synchronously so we know how many we'll actually run; then
  // hand the slow TTS work to after() so the response flushes fast.
  const claimed: Array<{ postId: string; input: string; slug: string }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  for (const c of candidates) {
    const result = await claimAudioGeneration(c.slug, { force: wantForce });
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
    force: wantForce,
  });
}
