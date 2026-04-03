# Parchment Blog — Claude Code Context

## Project
Minimalist blogging platform. Next.js 16 App Router · React 19 · TypeScript (strict) · Prisma/PostgreSQL · React Query · Tailwind CSS 4 · CodeMirror 6 · NextAuth 4 · AWS S3 · Resend · Sentry · Vercel.

**Repo:** https://github.com/omerskywalker/parchment-blog
**Live domain:** https://parchment.blog (custom domain set up 2026-04-02 via Vercel)
**Working directory:** `~/Desktop/projects/parchment-blog` (not iCloud-synced — never use the old path at `~/Desktop/Desktop - Omer's MacBook Air/code/parchment-blog`)

## Collaboration Style
- Work autonomously. Don't ask permission for small decisions.
- Create feature branches off `main`, push, open PRs — Omer reviews and merges on GitHub.
- After each batch of changes: update `IMPLEMENTATION_STATUS.md` and summarize what was done.
- Update `CLAUDE.md` at the end of each session with current project state, decisions made, and anything that would save context next time.
- GitHub handle: omerskywalker

## Definition of Done — Required Before Marking Any PR Complete
A feature or PR is **not complete** until all of the following pass:
1. **`npm test`** — all vitest tests green (pre-push hook enforces this, but verify explicitly)
2. **GitHub Actions CI** — build + lint + test checks must all pass (green ✓) on the PR
3. **Vercel preview deployment** — the Vercel preview deploy for the PR branch must succeed

If any pipeline is failing, investigate and fix before marking the PR complete. Document blockers that require external action (env vars, plan upgrades, etc.) clearly in the PR description and in `IMPLEMENTATION_STATUS.md`.

## Current Status (as of 2026-04-02)
- **24-item code review (ROADMAP_v2):** ✅ ALL SHIPPED — PRs #36–#55 merged
- **Active roadmap:** `ROADMAP_v3.md` — editor affordances + polish (see file for full list)
- **Domain:** Migrated to `parchment.blog` — Vercel DNS set up. Pending: update env vars in Vercel dashboard and OAuth consoles (see Domain Migration section below).

## Infrastructure
- **Database:** Prisma + PostgreSQL. Local dev: `localhost:5432/blog`. Production: connection string stored in Vercel env vars (`DATABASE_URL` + `DIRECT_URL`). The dual-URL pattern suggests Neon (pooled + direct). Confirm in Vercel dashboard.
- **Auth:** NextAuth 4 — GitHub and Google OAuth providers + credentials (email/password)
- **Email:** Resend — email verification, password reset, fire milestone notifications
- **Storage:** AWS S3 — avatar image uploads only (no article image uploads yet)
- **Rate limiting:** Upstash Redis free tier (sliding window on auth endpoints)
- **Hosting:** Vercel — cron job every 5 min for scheduled post publishing (`/api/cron/publish-scheduled`, protected by `CRON_SECRET`)
- **Error tracking:** Sentry

## Domain Migration Checklist (parchment.blog) — PENDING
These external console updates are NOT yet done and must be completed by Omer:

### Vercel Environment Variables (dashboard)
Set all of these to `https://parchment.blog` for production:
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL` (drives Resend email verification / password reset links)

### GitHub OAuth App
- Add callback URL: `https://parchment.blog/api/auth/callback/github`

### Google OAuth Console
- Add authorized redirect URI: `https://parchment.blog/api/auth/callback/google`
- Add authorized JS origin: `https://parchment.blog`

### AWS S3
- If bucket CORS policy lists the old Vercel URL as allowed origin, add `https://parchment.blog`

### Sentry
- Update allowed domains if origin filtering is configured

## Key Files
- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — shared utilities, server helpers, API clients
- `src/app/components/` — shared UI components
- `src/app/components/editor/MarkdownEditor.tsx` — CodeMirror editor (raw markdown, no toolbar)
- `src/app/components/Markdown.tsx` — react-markdown renderer (supports blockquotes + images in output)
- `prisma/schema.prisma` — database schema
- `src/lib/validators/` — Zod schemas
- `src/lib/queryKeys.ts` — React Query key factory
- `src/lib/email/resend.ts` — Resend email helpers (uses `APP_URL` env var)
- `IMPLEMENTATION_STATUS.md` — running log of all shipped PRs
- `ROADMAP_v3.md` — next feature wave

## Tech Decisions (resolved)
- **Rate limiting:** Upstash Redis free tier (not in-memory)
- **Search:** Postgres full-text via `plainto_tsquery` (not client-side)
- **Email:** Resend, dark-themed minimal templates matching app aesthetic
- **OG image:** Minimal "P" bubble in unique font, dark/cream palette
- **Image uploads:** S3, but only for avatars. Article image uploads not yet implemented.
- **Editor:** CodeMirror 6, raw markdown input — no WYSIWYG toolbar yet (planned in v3)
- **Blockquotes/images in articles:** Supported in rendering but users must type markdown manually (no insert UI)
