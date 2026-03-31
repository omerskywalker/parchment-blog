# Parchment Blog — Claude Code Context

## Project
Minimalist blogging platform. Next.js 16 App Router · React 19 · TypeScript (strict) · Prisma/PostgreSQL · React Query · Tailwind CSS 4 · CodeMirror 6 · NextAuth 4 · AWS S3 · Resend · Sentry · Vercel.

**Repo:** https://github.com/omerskywalker/parchment-blog
**Working directory:** `~/Desktop/projects/parchment-blog` (not iCloud-synced — never use the old path at `~/Desktop/Desktop - Omer's MacBook Air/code/parchment-blog`)

## Collaboration Style
- Work autonomously. Don't ask permission for small decisions.
- Create feature branches off `main`, push, open PRs — Omer reviews and merges on GitHub.
- After each batch of changes: update `IMPLEMENTATION_STATUS.md` and summarize what was done.
- GitHub handle: omerskywalker

## Definition of Done — Required Before Marking Any PR Complete
A feature or PR is **not complete** until all of the following pass:
1. **`npm test`** — all vitest tests green (pre-push hook enforces this, but verify explicitly)
2. **GitHub Actions CI** — build + lint + test checks must all pass (green ✓) on the PR
3. **Vercel preview deployment** — the Vercel preview deploy for the PR branch must succeed

If any pipeline is failing, investigate and fix before marking the PR complete. Document blockers that require external action (env vars, plan upgrades, etc.) clearly in the PR description and in `PHASE_2_STATUS.md`.

## Active Work: 24-Item Code Review Implementation

A full code review was completed on 2026-03-28. All 24 improvements were approved. Implementation is in progress via 11 feature branches:

| Branch | Items | Status |
|--------|-------|--------|
| `feat/empty-states-and-skeletons` | Loading skeletons, empty states | ✅ MERGED (#37) |
| `feat/editor-enhancements` | Unsaved changes warning, slug preview, live word count, tag pill input, post preview toggle | ✅ MERGED (#38) |
| `feat/autosave` | Draft autosave (localStorage + debounced API) | TODO |
| `feat/post-delete-confirmation` | Delete confirmation modal | 🔍 OPEN (#40) |
| `feat/author-profile-polish` | Public /u/[username] profile page polish | 🔍 OPEN (#39) |
| `feat/rss-feed` | /rss.xml route handler | TODO |
| `feat/search` | Full-text Postgres search (tsvector) | TODO |
| `feat/auth-polish` | Email verification (Resend), password reset polish, OAuth on register | TODO |
| `feat/performance` | Pagination, Upstash rate limiting ✅, next/image for avatars | 🔍 PARTIAL (#36 merged) |
| `feat/code-quality` | ApiResponse<T> type, error boundaries, query key audit | TODO |
| `feat/brand-and-meta` | Home copy, OG image redesign, favicon/metadata | TODO |

## Tech Decisions (already resolved)
- **Rate limiting:** Upstash Redis free tier (not in-memory — resets on serverless cold starts)
- **Search:** Postgres full-text via `tsvector` (not client-side)
- **Email:** Resend (already in stack), clean minimal template matching app aesthetic
- **OG image:** Minimal "P" bubble in unique font, matching app's dark/cream palette
- **Email verification:** Resend-powered, design matches app style

## Key Files
- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — shared utilities, server helpers, API clients
- `src/app/components/` — shared UI components
- `prisma/schema.prisma` — database schema
- `src/lib/validators/` — Zod schemas
- `src/lib/queryKeys.ts` — React Query key factory
- `IMPLEMENTATION_STATUS.md` — running status of all 24 improvements (update after each PR)
