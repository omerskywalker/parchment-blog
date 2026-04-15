---
type: project-index
tags: [parchment-blog, index]
last-updated: 2026-04-05
---

# Parchment — Project Wiki

> **Agents: read this file first.** It takes 60 seconds and orients you completely.
> Then read `WIKI/gotchas.md` before touching anything.
> Global wiki (cross-project context): `~/.claude/wiki/index.md`

---

## What This App Does

Parchment is a minimalist blogging platform for independent writers — no algorithmic feeds, no engagement traps. Writers get a distraction-free CodeMirror markdown editor with autosave; readers get clean post pages with full-text search, tag filtering, and fire reactions.

**Live:** https://parchment.blog

---

## Data Flow

```
Browser
  │
  ├─ Server Components (RSC) ──→ Prisma ──→ PostgreSQL
  │    └─ public feed (unstable_cache, 60s TTL, tag-invalidated on publish)
  │
  ├─ Route Handlers (API)
  │    ├─ /api/auth/*                  NextAuth (JWT + DB sessions)
  │    ├─ /api/posts/*                 CRUD, autosave, publish toggle
  │    ├─ /api/reactions               fire reactions (visitor cookie pb_vid)
  │    ├─ /api/cron/publish-scheduled  Vercel Cron 0 9 * * * (daily 9AM UTC)
  │    ├─ /api/s3/presign              avatar uploads → AWS S3
  │    └─ /api/og/*                    OG image generation (1200×630)
  │
  ├─ Client Components (TanStack Query v5)
  │    └─ editor autosave, tag pills, word count, fire button
  │
  └─ External Services
       ├─ Resend          transactional email (verify, reset, fire milestones)
       ├─ Upstash Redis   sliding-window rate limiting on auth endpoints
       ├─ AWS S3          avatar storage (presigned PUT uploads)
       └─ Sentry          error tracking (server + edge)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + @tailwindcss/typography |
| ORM | Prisma 6 → PostgreSQL |
| Auth | NextAuth v4 (JWT strategy, Google + GitHub OAuth, Prisma adapter) |
| Editor | CodeMirror 6 via @uiw/react-codemirror + @codemirror/lang-markdown |
| Markdown render | react-markdown + remark-gfm |
| Client state | TanStack React Query v5 |
| Validation | Zod v4 |
| Rate limiting | Upstash Redis (@upstash/ratelimit sliding-window) |
| Email | Resend |
| File storage | AWS S3 (presigned PUT uploads from browser) |
| Error tracking | Sentry (@sentry/nextjs) |
| Testing | Vitest (single-thread — see gotchas) |
| Hosting | Vercel (cron, analytics) |
| Local DB | Docker Compose (postgres on :5432) |

---

## Key Files

| File | What it does |
|---|---|
| `src/app/layout.tsx` | Root layout — Geist font, Analytics, QueryProvider, Header |
| `src/app/page.tsx` | Home page — hero + latest 3 posts (RSC, force-dynamic) |
| `src/app/posts/page.tsx` | Public post feed — infinite scroll, search bar, tag filter |
| `src/app/posts/[slug]/page.tsx` | Post detail — RSC, fire reaction, view increment, prev/next nav |
| `src/app/dashboard/posts/[id]/edit/page.tsx` | Editor — CodeMirror, autosave (3s debounce), publish toggle |
| `src/app/api/` | All route handlers (auth, posts, reactions, cron, s3, og, health) |
| `src/auth.ts` | NextAuth authOptions — Prisma adapter, Google/GitHub providers, callbacks |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/env.ts` | Zod-validated env (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET required) |
| `src/lib/server/public-posts.ts` | Cached public post queries (unstable_cache, 60s TTL, tag invalidation) |
| `src/lib/server/fire-notifications.ts` | Milestone emails at 5/25/100 fires — idempotent via FireNotification table |
| `src/lib/server/rate-limit.ts` | Upstash sliding-window; fail-open if Redis unreachable |
| `src/lib/server/search.ts` | PostgreSQL tsvector full-text search on title + contentMd |
| `src/lib/server/scheduled-publish.ts` | Cron logic — sets publishedAt, clears scheduledAt, revalidates cache |
| `src/lib/server/visitor.ts` | pb_vid cookie management (httpOnly, 1yr, anonymous visitor identity) |
| `src/lib/validators/` | Zod schemas for posts and auth inputs |
| `prisma/schema.prisma` | Full DB schema |
| `vercel.json` | Cron: `0 9 * * *` → `/api/cron/publish-scheduled` |
| `.github/workflows/ci.yml` | CI: lint → typecheck → test → build (PRs) → prisma migrate (main) |

---

## Design System

- **Font:** Geist (sans) + Geist Mono (code) via `next/font`
- **Color palette:** Near-black background, white text with opacity variants
  - Primary text: `text-white`
  - Muted text: `text-white/60`, `text-white/40`
  - Borders: `border-white/10`
  - Backgrounds: `bg-zinc-900`, `bg-zinc-800`
- **Prose:** `@tailwindcss/typography` prose classes for rendered markdown
- **Tailwind version:** v4 — CSS-first config, no `tailwind.config.js`
- **Layout max-width:** `max-w-[845px]` centered, `px-4` gutters

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (pooled, for runtime queries) | Yes |
| `DIRECT_URL` | PostgreSQL direct (for Prisma migrations) | Yes |
| `NEXTAUTH_SECRET` | JWT signing secret (min 10 chars) | Yes |
| `NEXTAUTH_URL` | Auth callback base URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL (client-accessible) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL — must be `https://parchment.blog` in prod | Yes |
| `CRON_SECRET` | Bearer token to authenticate the cron endpoint | Yes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth provider | Optional |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth provider | Optional |
| `RESEND_API_KEY` | Email sending — falls back to console log if absent | Optional |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 avatar uploads | Optional |
| `AWS_REGION` / `AWS_S3_BUCKET` | S3 bucket config | Optional |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis rate limiting — fail-open if absent | Optional |
| `SENTRY_AUTH_TOKEN` | Sentry source maps upload | Optional |

---

## Database Schema

| Model | Key fields | Notes |
|---|---|---|
| `User` | email, username (unique), bio (varchar 280), avatarKey, autoPublish | avatarKey is S3 object key, not full URL |
| `Post` | title, slug (unique), contentMd, tags[], publishedAt, scheduledAt, viewCount, fireCount | scheduledAt cleared after cron publishes |
| `PostReaction` | postId, visitorId, kind=FIRE | Unique on (postId, visitorId, kind) — DB-level dedup |
| `FireNotification` | postId, milestone (5/25/100) | Unique on (postId, milestone) — idempotency key |
| `PasswordResetToken` | userId, tokenHash, expiresAt | Token hashed before storage |
| `Account` / `Session` / `VerificationToken` | — | Standard NextAuth v4 tables |

---

## Architecture Highlights

- **Reactions:** Anonymous visitor tracked via `pb_vid` cookie (httpOnly, 1-year, path `/`). Unique constraint at DB level prevents double-fires.
- **Cache invalidation:** `revalidateTag()` called on publish/unpublish. Tags: `public-posts`, `post-[slug]`.
- **Search:** `plainto_tsquery` on a `tsvector` over title + contentMd. Input sanitized server-side.
- **Pagination:** Cursor-based (post ID), not offset. 10 per page.
- **Scheduled publishing:** Daily Vercel Cron at 9AM UTC picks up posts where `scheduledAt <= now()`.
- **Email fire-and-forget:** Email sends never block API responses. Fail silently in dev if no `RESEND_API_KEY`.
- **Rate limiting:** Fail-open — if Upstash is unreachable, requests pass through.

---

## Conventions

- **Branch naming:** `feat/`, `fix/`, `chore/` prefixes
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`)
- **PRs:** squash-merge to main; Vercel auto-deploys on merge
- **Migrations:** CI runs `prisma migrate deploy` on every push to main
- **Tests:** `npm test` — Vitest single-thread (see gotchas)
- **Type check:** `npm run typecheck` — `tsc --noEmit`
- **Lint:** `npm run lint` — ESLint 9 with unused-imports plugin
- **Format:** `npm run format` — Prettier with Prisma + Tailwind plugins
- **Git hooks:** `.githooks/pre-commit` via `core.hooksPath`

---

## Current Status (2026-04-05)

- 72 PRs shipped; live at `parchment.blog`
- Speed Insights removed (PR #72 — Vercel Pro add-on cost)
- Canonical domain set to `parchment.blog` (PR #71)
- ROADMAP v3 in planning — Editor affordances (E1–E7) next

---

## Navigation

- [gotchas.md](gotchas.md) — **Read this before touching anything**
- [decisions/](decisions/) — Architecture decision records
- [sessions/](sessions/) — Per-session work logs
