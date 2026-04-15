---
type: gotchas
tags: [gotchas, lessons-learned, parchment-blog]
last-updated: 2026-04-05
---

# Gotchas — Parchment

> Read this before starting any task. Each entry is a real thing that burned us.
> Add new entries at the top with the date.

---

## 2026-04-05 — Canonical domain is `parchment.blog`, not `*.vercel.app`

**Symptom:** OG tags, RSS feed, sitemap, or share links reference `parchment-blog.vercel.app`.

**Cause:** `NEXT_PUBLIC_SITE_URL` was set to the Vercel preview domain.

**Fix:** Always set `NEXT_PUBLIC_SITE_URL=https://parchment.blog` in production. Updated PR #71.

---

## 2026-04-05 — Speed Insights must NOT be re-added

**Symptom:** `@vercel/speed-insights` appears in dependencies.

**Cause:** It triggers a Vercel Pro add-on charge even on free-tier projects.

**Fix:** Do not add it back. Removed in PR #72.

---

## 2026-04-02 — Vitest must run single-threaded

**Symptom:** Tests hang or randomly time out.

**Cause:** Multi-thread Vitest causes SSR transform conflicts with Next.js module resolution.

**Fix:** Vitest config sets `pool: 'forks'` with `singleFork: true` (or equivalent single-thread flag). See `vitest.config.ts`. Fixed in PR #69. Never remove this setting.

---

## Reactions use an anonymous cookie, not auth

**Symptom:** You add auth checks to the reactions endpoint and break it for logged-out users.

**Cause:** Fire reactions are intentionally visitor-scoped via `pb_vid` cookie, not user accounts. Logged-out readers can react.

**Fix:** Keep the reactions API auth-free. Dedup happens at the DB level via unique constraint on `(postId, visitorId, kind)`.

---

## Email sends are fire-and-forget — never await them in the request path

**Symptom:** API response latency spikes when email sending is slow or times out.

**Cause:** Email sends were blocking the API response.

**Fix:** All Resend calls are fire-and-forget. In dev without `RESEND_API_KEY`, the server logs a preview link — this is intentional, not a bug.

---

## Rate limiting is fail-open — don't rely on it for correctness

**Symptom:** Auth endpoints accept requests even when Upstash is down.

**Cause:** `rate-limit.ts` is configured to allow requests through on Redis errors to avoid auth outages.

**Fix:** This is intentional. Do not add hard failures on Redis errors. The tradeoff is accepted.

---

## `avatarKey` is an S3 object key, not a URL

**Symptom:** Rendering `user.avatarKey` directly as an `<img src>` shows a broken image.

**Cause:** `avatarKey` stores only the S3 object key (e.g. `avatars/user-123.png`), not the full CDN URL.

**Fix:** Construct the full URL: `` `https://${bucket}.s3.${region}.amazonaws.com/${avatarKey}` `` (or use the presigned URL flow for private buckets).

---

## `DIRECT_URL` is required alongside `DATABASE_URL` for migrations

**Symptom:** `prisma migrate deploy` fails in CI.

**Cause:** Prisma requires a direct (non-pooled) connection for migrations. `DATABASE_URL` may be pooled (PgBouncer).

**Fix:** Always set both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in CI secrets and production env.

---

## No gotchas yet for this area — be the first to add one

When you discover something surprising, add it here:

```
## {DATE} — {Short title}

**Symptom:** What went wrong or what was unexpected.

**Cause:** Why it happened.

**Fix:** What to do instead.
```
