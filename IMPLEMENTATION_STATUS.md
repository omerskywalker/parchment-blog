# Implementation Status — 24-Item Code Review

Last updated: 2026-03-28

## Branch Summary

| Branch | Items | Status |
|--------|-------|--------|
| `feat/empty-states-and-skeletons` | Loading skeletons, empty states | TODO |
| `feat/editor-enhancements` | Unsaved changes warning, slug preview, live word count, tag pill input, post preview toggle | TODO |
| `feat/autosave` | Draft autosave (localStorage + debounced API) | TODO |
| `feat/post-delete-confirmation` | Delete confirmation modal | TODO |
| `feat/author-profile-polish` | Public /u/[username] profile page polish | TODO |
| `feat/rss-feed` | /rss.xml route handler | TODO |
| `feat/search` | Full-text Postgres search (tsvector) | TODO |
| `feat/auth-polish` | Email verification (Resend), password reset polish, OAuth on register | TODO |
| `feat/performance` | Pagination, Upstash rate limiting, next/image for avatars | IN PROGRESS |
| `feat/code-quality` | ApiResponse<T> type, error boundaries, query key audit | TODO |
| `feat/brand-and-meta` | Home copy, OG image redesign, favicon/metadata | TODO |

---

## `feat/performance` — Detail

### Upstash Redis Rate Limiting ✅

- Installed `@upstash/redis` and `@upstash/ratelimit`
- `src/lib/server/redis.ts` — Redis client, gracefully returns `null` when env vars absent (CI-safe)
- `src/lib/server/rate-limit.ts` — `checkRateLimit` helper + per-endpoint limiters
- Added `RATE_LIMITED` to `ERROR_CODES`

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/register` | 5 | 1 hour |
| `POST /api/auth/forgot-password` | 3 | 15 min |
| `POST /api/auth/reset-password` | 5 | 15 min |

Returns `429` with `{ ok: false, error: "RATE_LIMITED", retryAfter: <seconds> }`.

### Pagination — TODO
### next/image for avatars — TODO
