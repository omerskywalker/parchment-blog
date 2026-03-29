
 ________  ________  ________  ________  ___  ___  ___  ________  _______   ________   _________
|\   __  \|\   __  \|\   __  \|\   ____\|\  \|\  \|\  \|\   ____\|\  ___ \ |\   ___  \|\___   ___\
\ \  \|\  \ \  \|\  \ \  \|\  \ \  \___|\ \  \\\  \ \  \ \  \___|\ \   __/|\ \  \\ \  \|___ \  \_|
 \ \   ____\ \   __  \ \   _  _\ \  \    \ \   __  \ \  \ \  \    \ \  \_|/_\ \  \\ \  \   \ \  \
  \ \  \___|\ \  \ \  \ \  \\  \\ \  \____\ \  \ \  \ \  \ \  \____\ \  \_|\ \ \  \\ \  \   \ \  \
   \ \__\    \ \__\ \__\ \__\\ _\\ \_______\ \__\ \__\ \__\ \_______\ \_______\ \__\\ \__\   \ \__\
    \|__|     \|__|\|__|\|__|\|__|\|_______|\|__|\|__|\|__|\|_______|\|_______|\|__| \|__|    \|__|

  B L O G   ·   C O D E   R E V I E W   I M P L E M E N T A T I O N   S T A T U S
  Last updated: 2026-03-28

╔══════════════════════════════════════════════════════════════════════════════════╗
║  24-item code review approved 2026-03-28  ·  11 feature branches  ·  5 open   ║
╚══════════════════════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  MERGED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR #36  feat/performance  (partial — rate limiting only)
  ┌─────────────────────────────────────────────────────────────────┐
  │ • @upstash/redis + @upstash/ratelimit installed                 │
  │ • Sliding-window IP rate limits on 3 auth endpoints:           │
  │     POST /api/auth/register        →  5 req / 1 hr             │
  │     POST /api/auth/forgot-password →  3 req / 15 min           │
  │     POST /api/auth/reset-password  →  5 req / 15 min           │
  │ • 429 response: { error: "RATE_LIMITED", retryAfter: <s> }     │
  │ • Redis client gracefully no-ops when env vars absent (CI-safe) │
  └─────────────────────────────────────────────────────────────────┘

  PR #37  feat/empty-states-and-skeletons
  ┌─────────────────────────────────────────────────────────────────┐
  │ • PostCardSkeleton, PostListSkeleton, EditorSkeleton,           │
  │   ProfileSkeleton — animated pulse, matches card design system  │
  │ • Replaced all "Loading…" text across dashboard pages          │
  │ • My Posts empty state: centered layout + "New post" CTA        │
  │ • Error states upgraded to full card treatment                  │
  └─────────────────────────────────────────────────────────────────┘

  PR #38  feat/editor-enhancements
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Unsaved changes warning  — beforeunload fires when dirty      │
  │ • Slug preview             — live /posts/<slug> below field     │
  │ • Live word count          — updates as you type                │
  │ • Tag pill input           — Enter/comma to add, × to remove    │
  │ • Post preview toggle      — Write / Preview segmented control  │
  └─────────────────────────────────────────────────────────────────┘

  PR #39  feat/author-profile-polish
  ┌─────────────────────────────────────────────────────────────────┐
  │ • generateMetadata — proper <title> + description per profile   │
  │ • Avatar initials fallback when no photo is set                 │
  │ • Fire count in profile header stats bar                        │
  │ • Per-post read + fire counts on each post card                 │
  │ • Empty state: centered, contextual "check back later" message  │
  └─────────────────────────────────────────────────────────────────┘

  PR #40  feat/post-delete-confirmation
  ┌─────────────────────────────────────────────────────────────────┐
  │ • DeleteConfirmModal component                                   │
  │     - backdrop blur + click-to-dismiss                          │
  │     - Escape key closes modal                                   │
  │     - Accessible: role="dialog", aria-modal, aria-labelledby    │
  │     - Disabled state on both buttons while deleting             │
  │ • Replaces window.confirm() on the edit post page               │
  └─────────────────────────────────────────────────────────────────┘

  PR #44  feat/autosave
  ┌─────────────────────────────────────────────────────────────────┐
  │ • useLocalDraft hook — generic localStorage save/restore        │
  │ • useDebounce hook   — stable fn-ref debounce                   │
  │ • New post: saves to localStorage on every change, restores on  │
  │   mount (if blank), clears on submit or Cancel                  │
  │ • Edit post: debounced PATCH 3 s after typing stops;            │
  │   "Saving…" → "Draft saved" status indicator in the form       │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍  OPEN — AWAITING REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR #43  feat/brand-and-meta                        ← merge first
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Title: "Parchment — Write Without Noise"                      │
  │ • Template: "%s · Parchment"                                    │
  │ • Full OpenGraph + Twitter card defaults                        │
  │ • Homepage h1 → "Parchment", new two-part tagline               │
  │ • RSS autodiscovery included (superset of #42's layout change)  │
  │   NOTE: layout.tsx conflict — accept #43's version              │
  └─────────────────────────────────────────────────────────────────┘

  PR #44  feat/autosave                              ← merge any time (no conflicts)
  ┌─────────────────────────────────────────────────────────────────┐
  │ • New post: localStorage draft, restored on mount, cleared      │
  │   on submit or Cancel                                            │
  │ • Edit post: debounced PATCH 3s after last keystroke            │
  │ • Subtle "Saving…" / "Draft saved" indicator in editor          │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏗️   TODO — NOT STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  feat/search
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Postgres full-text search via tsvector                        │
  │ • Migration to add generated tsvector column + GIN index        │
  │ • Search API route + UI on /posts page                          │
  └─────────────────────────────────────────────────────────────────┘

  feat/auth-polish
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Email verification via Resend on register                     │
  │ • Password reset UI polish                                      │
  │ • OAuth on register page (currently signin-only)                │
  └─────────────────────────────────────────────────────────────────┘

  feat/performance  (remaining items)
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Pagination on /posts feed                                     │
  │ • next/image for all avatar <img> tags                          │
  └─────────────────────────────────────────────────────────────────┘

  feat/code-quality
  ┌─────────────────────────────────────────────────────────────────┐
  │ • ApiResponse<T> type (standardise across all routes)           │
  │ • Error boundaries in client components                         │
  │ • React Query key factory audit                                 │
  └─────────────────────────────────────────────────────────────────┘

  feat/brand-and-meta
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Homepage copy refresh                                         │
  │ • OG image redesign — minimal "P" bubble                        │
  │ • Favicon + global metadata pass                                │
  └─────────────────────────────────────────────────────────────────┘



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊  PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Merged  [████████░░░░░░░░░░░░]  3 / 11 branches
  Open    [██████░░░░░░░░░░░░░░]  3 / 11 awaiting review
  Todo    [░░░░░░░░░░░░░░░░░░░░]  5 / 11 not started

