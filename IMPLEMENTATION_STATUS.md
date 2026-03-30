
 ________  ________  ________  ________  ___  ___  ___  ________  _______   ________   _________
|\   __  \|\   __  \|\   __  \|\   ____\|\  \|\  \|\  \|\   ____\|\  ___ \ |\   ___  \|\___   ___\
\ \  \|\  \ \  \|\  \ \  \|\  \ \  \___|\ \  \\\  \ \  \ \  \___|\ \   __/|\ \  \\ \  \|___ \  \_|
 \ \   ____\ \   __  \ \   _  _\ \  \    \ \   __  \ \  \ \  \    \ \  \_|/_\ \  \\ \  \   \ \  \
  \ \  \___|\ \  \ \  \ \  \\  \\ \  \____\ \  \ \  \ \  \ \  \____\ \  \_|\ \ \  \\ \  \   \ \  \
   \ \__\    \ \__\ \__\ \__\\ _\\ \_______\ \__\ \__\ \__\ \_______\ \_______\ \__\\ \__\   \ \__\
    \|__|     \|__|\|__|\|__|\|__|\|_______|\|__|\|__|\|__|\|_______|\|_______|\|__| \|__|    \|__|

  B L O G   ·   C O D E   R E V I E W   I M P L E M E N T A T I O N   S T A T U S
  Last updated: 2026-03-29

╔══════════════════════════════════════════════════════════════════════════════════╗
║  24-item code review approved 2026-03-28  ·  11 feature branches  ·  6 open   ║
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
  🔍  OPEN — AWAITING REVIEW  (merge in order shown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR #43  feat/brand-and-meta                        ← merge first (no deps)
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Title: "Parchment — Write Without Noise"                      │
  │ • Template: "%s · Parchment"                                    │
  │ • Full OpenGraph + Twitter card defaults                        │
  │ • Homepage h1 → "Parchment", new two-part tagline               │
  │ • RSS autodiscovery included (superset of #42's layout change)  │
  └─────────────────────────────────────────────────────────────────┘

  PR #44  feat/autosave                              ← merge any time (no conflicts)
  ┌─────────────────────────────────────────────────────────────────┐
  │ • New post: localStorage draft, restored on mount, cleared      │
  │   on submit or Cancel                                            │
  │ • Edit post: debounced PATCH 3s after last keystroke            │
  │ • Subtle "Saving…" / "Draft saved" indicator in editor          │
  └─────────────────────────────────────────────────────────────────┘

  PR #47  feat/code-quality                          ← merge before #48 and #46
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Vitest ^3.2.4 installed; 28 unit tests pass                   │
  │     wordCount (7) · slugify (7) · queryKeys (8) · s3 (6)        │
  │ • ApiResponse<T> generic type in src/lib/types.ts               │
  │ • ErrorBoundary client component                                │
  │ • qk factory expanded: publicFeed, publicPost, profile, postStats│
  │ • .githooks/pre-push runs npm test before every push            │
  │ • CI: Test step added between Typecheck and Build               │
  └─────────────────────────────────────────────────────────────────┘

  PR #48  feat/performance                           ← merge after #47
  ┌─────────────────────────────────────────────────────────────────┐
  │ • next.config.ts: images.remotePatterns for **.amazonaws.com    │
  │ • 4 components: <img> → <Image> with explicit width/height      │
  │     HomeLatestPosts · public-posts-feed · [slug] · u/[username] │
  │ • s3.test.ts: 6 tests for s3PublicUrlFromKey (included in #47's │
  │   vitest run on CI)                                              │
  └─────────────────────────────────────────────────────────────────┘

  PR #46  feat/search                                ← merge after #47 and #48
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Postgres full-text via plainto_tsquery (no migration needed)  │
  │ • GET /api/posts/search?q= — sanitized, ranked by ts_rank       │
  │ • SearchBar (400ms debounce) + SearchFeed client component      │
  │ • PostsPageClient wires search vs. existing infinite scroll      │
  │ • search.test.ts: 7 tests for sanitizeSearchQuery               │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏗️   TODO — NOT STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  feat/auth-polish
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Email verification via Resend on register                     │
  │ • Password reset UI polish                                      │
  │ • OAuth on register page (currently signin-only)                │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊  PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Merged  [████████████░░░░░░░░]  6 / 11 branches
  Open    [████████████░░░░░░░░]  6 / 11 awaiting review
  Todo    [░░░░░░░░░░░░░░░░░░░░]  1 / 11 not started (auth-polish)

