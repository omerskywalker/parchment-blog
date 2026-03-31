
 ________  ________  ________  ________  ___  ___  ___  ________  _______   ________   _________
|\   __  \|\   __  \|\   __  \|\   ____\|\  \|\  \|\  \|\   ____\|\  ___ \ |\   ___  \|\___   ___\
\ \  \|\  \ \  \|\  \ \  \|\  \ \  \___|\ \  \\\  \ \  \ \  \___|\ \   __/|\ \  \\ \  \|___ \  \_|
 \ \   ____\ \   __  \ \   _  _\ \  \    \ \   __  \ \  \ \  \    \ \  \_|/_\ \  \\ \  \   \ \  \
  \ \  \___|\ \  \ \  \ \  \\  \\ \  \____\ \  \ \  \ \  \ \  \____\ \  \_|\ \ \  \\ \  \   \ \  \
   \ \__\    \ \__\ \__\ \__\\ _\\ \_______\ \__\ \__\ \__\ \_______\ \_______\ \__\\ \__\   \ \__\
    \|__|     \|__|\|__|\|__|\|__|\|_______|\|__|\|__|\|__|\|_______|\|_______|\|__| \|__|    \|__|

  B L O G   ·   C O D E   R E V I E W   I M P L E M E N T A T I O N   S T A T U S
  Last updated: 2026-03-31

╔══════════════════════════════════════════════════════════════════════════════════╗
║  24-item code review approved 2026-03-28  ·  ALL ITEMS SHIPPED & MERGED  🎉   ║
╚══════════════════════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  MERGED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR #36  feat/performance  (partial — rate limiting only)   merged 2026-03-28
  ┌─────────────────────────────────────────────────────────────────┐
  │ • @upstash/redis + @upstash/ratelimit installed                 │
  │ • Sliding-window IP rate limits on 3 auth endpoints:           │
  │     POST /api/auth/register        →  5 req / 1 hr             │
  │     POST /api/auth/forgot-password →  3 req / 15 min           │
  │     POST /api/auth/reset-password  →  5 req / 15 min           │
  │ • 429 response: { error: "RATE_LIMITED", retryAfter: <s> }     │
  │ • Redis client gracefully no-ops when env vars absent (CI-safe) │
  └─────────────────────────────────────────────────────────────────┘

  PR #37  feat/empty-states-and-skeletons                    merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • PostCardSkeleton, PostListSkeleton, EditorSkeleton,           │
  │   ProfileSkeleton — animated pulse, matches card design system  │
  │ • Replaced all "Loading…" text across dashboard pages          │
  │ • My Posts empty state: centered layout + "New post" CTA        │
  │ • Error states upgraded to full card treatment                  │
  └─────────────────────────────────────────────────────────────────┘

  PR #38  feat/editor-enhancements                           merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Unsaved changes warning  — beforeunload fires when dirty      │
  │ • Slug preview             — live /posts/<slug> below field     │
  │ • Live word count          — updates as you type                │
  │ • Tag pill input           — Enter/comma to add, × to remove    │
  │ • Post preview toggle      — Write / Preview segmented control  │
  └─────────────────────────────────────────────────────────────────┘

  PR #39  feat/author-profile-polish                         merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • generateMetadata — proper <title> + description per profile   │
  │ • Avatar initials fallback when no photo is set                 │
  │ • Fire count in profile header stats bar                        │
  │ • Per-post read + fire counts on each post card                 │
  │ • Empty state: centered, contextual "check back later" message  │
  └─────────────────────────────────────────────────────────────────┘

  PR #40  feat/post-delete-confirmation                      merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • DeleteConfirmModal component                                   │
  │     - backdrop blur + click-to-dismiss                          │
  │     - Escape key closes modal                                   │
  │     - Accessible: role="dialog", aria-modal, aria-labelledby    │
  │     - Disabled state on both buttons while deleting             │
  │ • Replaces window.confirm() on the edit post page               │
  └─────────────────────────────────────────────────────────────────┘

  PR #41  fix/edit-page-missing-imports                      merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Hotfix: restored imports and modal state lost in merge        │
  │   conflict during editor-enhancements → delete-confirmation     │
  └─────────────────────────────────────────────────────────────────┘

  PR #42  feat/rss-feed                                      merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • GET /rss.xml — valid RSS 2.0 feed of published posts          │
  │ • <link rel="alternate"> added to layout for autodiscovery      │
  └─────────────────────────────────────────────────────────────────┘

  PR #43  feat/brand-and-meta                                merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Title template "%s · Parchment"                               │
  │ • Full OpenGraph + Twitter card defaults in layout              │
  │ • Homepage copy updated to "Write Without Noise" tagline        │
  └─────────────────────────────────────────────────────────────────┘

  PR #44  feat/autosave                                      merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • useLocalDraft hook — generic localStorage save/restore        │
  │ • useDebounce hook   — stable fn-ref debounce                   │
  │ • New post: saves to localStorage on every change, restores on  │
  │   mount (if blank), clears on submit or Cancel                  │
  │ • Edit post: debounced PATCH 3 s after typing stops;            │
  │   "Saving…" → "Draft saved" status indicator in the form       │
  └─────────────────────────────────────────────────────────────────┘

  PR #45  feat/mobile-optimisation                           merged 2026-03-29
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Responsive layout fixes across all pages                      │
  └─────────────────────────────────────────────────────────────────┘

  PR #46  feat/search                                        merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Postgres full-text via plainto_tsquery                        │
  │ • SearchBar (400ms debounce) + SearchFeed client component      │
  │ • PostsPageClient wires search vs. existing infinite scroll      │
  │ • search.test.ts: 7 tests for sanitizeSearchQuery               │
  └─────────────────────────────────────────────────────────────────┘

  PR #47  feat/code-quality                                  merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Vitest ^3.2.4; 28 unit tests (wordCount, slugify, queryKeys,  │
  │   s3) passing in CI                                             │
  │ • ApiResponse<T> type; ErrorBoundary component                  │
  │ • pre-push hook runs npm test before every push                 │
  └─────────────────────────────────────────────────────────────────┘

  PR #48  feat/performance                                   merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • next/image used in 4 components for optimised delivery        │
  │ • remotePatterns configured for S3 domain                       │
  └─────────────────────────────────────────────────────────────────┘

  PR #49  fix/search-test-expectations                       merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Corrected 4 wrong test expectations in search.test.ts         │
  │ • Unblocked CI on all branches carrying this file               │
  └─────────────────────────────────────────────────────────────────┘

  PR #50  feat/auto-publish                                  merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • User.autoPublish Boolean (default true) — Prisma migration    │
  │ • New post: reads profile pref, auto-publishes on submit        │
  │ • 5-second undo toast after auto-publish                        │
  │ • Profile page toggle switch under "Publishing" section         │
  │ • auto-publish.test.ts: 4 unit tests                            │
  │ ⚠  prisma migrate deploy required on Vercel                     │
  └─────────────────────────────────────────────────────────────────┘

  PR #51  feat/auth-polish                                   merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Email verification via Resend on register                     │
  │     POST /api/auth/send-verification (rate-limited)             │
  │     GET  /api/auth/verify-email?token= (SHA-256 hash-verified)  │
  │     /verify-email page — expired / invalid / pending states     │
  │     VerifyEmailBanner in dashboard (credentials users only)     │
  │ • email-verify.test.ts: 6 unit tests                            │
  └─────────────────────────────────────────────────────────────────┘

  PR #52  feat/post-settings                                 merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Post.scheduledAt DateTime? — Prisma migration                  │
  │ • Schedule panel in editor: datetime-local, Set / Clear buttons │
  │ • Blue "Scheduled" badge; "Publish now" still available         │
  │ • GET /api/cron/publish-scheduled protected by CRON_SECRET      │
  │ • vercel.json: cron every 5 minutes                             │
  │ • scheduled-publish.test.ts: 6 unit tests                       │
  │ ⚠  prisma migrate deploy required on Vercel                     │
  └─────────────────────────────────────────────────────────────────┘

  PR #53  feat/share-buttons                                 merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Twitter/X share button in PostShareActions                    │
  │     Opens x.com/intent/tweet with encoded title + URL           │
  │     X SVG logo; 3-col grid on mobile                            │
  │ • share.test.ts: 5 unit tests                                   │
  └─────────────────────────────────────────────────────────────────┘

  PR #54  feat/email-notifications                           merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • FireNotification table — idempotent milestone tracking        │
  │ • Milestones: 5 / 25 / 100 fires; highest pending sent first    │
  │ • maybeNotifyFireMilestone() — best-effort, never blocks HTTP   │
  │ • Dark-themed Resend email with "View post →" CTA               │
  │ • fire-notifications.test.ts: 8 unit tests                      │
  │ ⚠  prisma migrate deploy required on Vercel                     │
  └─────────────────────────────────────────────────────────────────┘

  PR #55  feat/related-posts                                 merged 2026-03-30
  ┌─────────────────────────────────────────────────────────────────┐
  │ • getRelatedPosts() — hasSome Postgres query + JS overlap sort  │
  │ • RelatedPosts server component — 3-col card grid below article │
  │ • Hidden automatically when no tag overlap exists               │
  │ • related-posts.test.ts: 7 unit tests                           │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊  PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Merged  [████████████████████]  19 / 19 PRs
  Open    [░░░░░░░░░░░░░░░░░░░░]   0 remaining
  Todo    [░░░░░░░░░░░░░░░░░░░░]   0 — nothing left to build

  All 24 original code-review items are shipped and merged. ✅


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠  POST-MERGE CHECKLIST (Vercel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Three PRs added Prisma migrations. Run sequentially on Vercel:

  1. prisma migrate deploy  — after PR #50 (User.autoPublish)
  2. prisma migrate deploy  — after PR #52 (Post.scheduledAt)
  3. prisma migrate deploy  — after PR #54 (FireNotification table)
