
  ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██╗██╗
  ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ██║██║
  ██████╔╝███████║███████║███████╗█████╗      ██║██║
  ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝      ╚═╝╚═╝
  ██║     ██║  ██║██║  ██║███████║███████╗    ██╗██╗
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝╚═╝

  U I / U X   R E F I N E M E N T S   +   E D I T O R   ·   P H A S E   2
  Last updated: 2026-03-31

╔══════════════════════════════════════════════════════════════════════════════════╗
║  13 screenshot-verified issues  ·  5 additional suggestions  ·  16 PRs total  ║
║  Editor batch built on CodeMirror 6, then migrated to TipTap in isolation      ║
╚══════════════════════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  MERGED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  (none yet)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍  OPEN — AWAITING REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR #57  fix/seo-meta  →  https://github.com/omerskywalker/parchment-blog/pull/57
  ┌─────────────────────────────────────────────────────────────────┐
  │ • getBaseUrl() prefers NEXT_PUBLIC_SITE_URL (env set in Vercel) │
  │ • og:description derived from first paragraph of post content   │
  │   (markdown stripped, truncated to 155 chars, platform fallback)│
  │ • /sitemap.xml via MetadataRoute.Sitemap — all published posts  │
  │   + static routes (/, /posts)                                   │
  │ • .env.example documents NEXT_PUBLIC_SITE_URL                   │
  └─────────────────────────────────────────────────────────────────┘

  PR #58  fix/accessibility  →  https://github.com/omerskywalker/parchment-blog/pull/58
  ┌─────────────────────────────────────────────────────────────────┐
  │ • Fire button: aria-label toggles "React to this post" /        │
  │   "Remove reaction" in sync with aria-pressed                   │
  │ • Copy button: aria-label="Copy link"                           │
  │ • Share button: aria-label="Share post"                         │
  │ • Hamburger: aria-controls="mobile-nav" + id on dropdown panel  │
  └─────────────────────────────────────────────────────────────────┘

  PR #59  feat/prev-next-navigation  →  https://github.com/omerskywalker/parchment-blog/pull/59
  ┌─────────────────────────────────────────────────────────────────┐
  │ • getAdjacentPosts(slug) — queries by createdAt, same-author    │
  │   first then global fallback, parallel Promise.all              │
  │ • PrevNextNav server component — ← Previous / Next →           │
  │   two-column layout, hidden when no adjacent post               │
  │ • Rendered below article body, above RelatedPosts               │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔲  PENDING — NOT YET STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  See IMPLEMENTATION PLAN below for the recommended build order.

  PR #60  feat/dashboard-post-stats                             🟡 UX
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #7 — /dashboard/posts list shows no stats per post        │
  │ • Add 👁 view count + 🔥 fire count to each row in My Posts     │
  │ • Matches existing display in dashboard home Recent Posts       │
  │ • Sort options: by date (default), by views, by fires           │
  └─────────────────────────────────────────────────────────────────┘

  PR #61  fix/card-polish                                       🟡 UX
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #5 — Post card titles use truncate instead of line-clamp-2│
  │ • Replace truncate → line-clamp-2 on title element in PostCard  │
  │ • Allows longer titles to wrap gracefully to a second line      │
  │                                                                 │
  │ Issue #8 — Homepage cards omit date and read time               │
  │ • Add createdAt date + read time to homepage "Latest posts"     │
  │   cards to match /posts page treatment                          │
  │ • Makes it a deliberate parity decision, not an accident        │
  │                                                                 │
  │ Issue #13 — "New post →" CTA doesn't adapt for logged-out users │
  │ • Logged-in:  "New post →" → /dashboard/posts/new              │
  │ • Logged-out: "Start writing →" → /auth/signin                 │
  │ • Ensure auth gate shows a clear message, not a silent redirect │
  └─────────────────────────────────────────────────────────────────┘

  ── BATCH 3 · Polish + Discoverability ────────────────────────────────

  PR #62  feat/reading-progress                                 🟡 UX
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #4 — No reading progress indicator                        │
  │ • Thin fixed bar at top of viewport, fills as user scrolls      │
  │ • Only renders on /posts/[slug] pages                           │
  │ • Styled to match Parchment's palette (cream/warm accent)       │
  └─────────────────────────────────────────────────────────────────┘

  PR #63  feat/footer                                           🟡 UX
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #6 — No footer                                            │
  │ • © 2026 Parchment · minimal one-row layout                    │
  │ • Links: About · GitHub · RSS · Tags                            │
  │ • Consistent across all routes via root layout                  │
  └─────────────────────────────────────────────────────────────────┘

  PR #64  fix/search-empty-state                                🔵 polish
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #12 — No empty state for search results                   │
  │ • "No posts match '{query}'" message when results are empty     │
  │ • Includes a clear-search link to reset the query               │
  │ • Matches existing empty state treatment from Phase 1           │
  └─────────────────────────────────────────────────────────────────┘

  PR #65  feat/tags-page                                        🔵 polish
  ┌─────────────────────────────────────────────────────────────────┐
  │ Issue #11 — No "Browse by tag" page                             │
  │ • /tags — lists all tags used across published posts with       │
  │   post count per tag                                            │
  │ • Clicking a tag navigates to /posts?tag=<tag> (existing filter)│
  │ • Link to /tags added to site footer and /posts header          │
  └─────────────────────────────────────────────────────────────────┘

  PR #66  feat/code-block-copy                                  ★ Claude suggestion
  ┌─────────────────────────────────────────────────────────────────┐
  │ Parchment's audience skews developer — code blocks are common   │
  │ • "Copy" button appears on hover in top-right of each code block│
  │ • Uses clipboard API; button text toggles "Copied!" for 2s      │
  │ • Minimal styling matching existing dark code theme             │
  └─────────────────────────────────────────────────────────────────┘

  ── BATCH 4 · Editor & Content Richness (CodeMirror 6) ────────────────

  NOTE: No new DevOps required. S3 already configured from PR #48.
  All 3 PRs in this batch build on the existing CodeMirror 6 setup.
  These features are fully retained when migrating to TipTap (Batch 5).

  PR #67  feat/image-uploads-in-editor                          ★ new feature
  ┌─────────────────────────────────────────────────────────────────┐
  │ • POST /api/upload/post-image — presigned S3 upload endpoint    │
  │   (separate prefix from avatar uploads, same bucket)           │
  │ • Drag-and-drop images onto the CodeMirror editor area          │
  │ • Paste image from clipboard (Ctrl/Cmd+V)                       │
  │ • Toolbar "Image" button — opens file picker as fallback        │
  │ • Inserts ![filename](s3-url) at cursor position on upload      │
  │ • Upload progress indicator in editor status bar                │
  │ • Max file size enforced (5 MB); jpg/png/gif/webp accepted      │
  └─────────────────────────────────────────────────────────────────┘

  PR #68  feat/rich-markdown-toolbar                            ★ new feature
  ┌─────────────────────────────────────────────────────────────────┐
  │ Visual formatting toolbar above the CodeMirror editor           │
  │ • Bold · Italic · Strikethrough                                 │
  │ • Heading (H1 / H2 / H3 dropdown)                              │
  │ • Block quote  — inserts "> " prefix, styled as pull quote      │
  │ • Section separator — inserts "---" (rendered as wide visual    │
  │   rule with breathing room in preview)                          │
  │ • Inline code · Code block (with language selector)            │
  │ • Ordered list · Unordered list · Task list (- [ ])            │
  │ • Link — wraps selection as [text](url), prompts for URL        │
  │ • Image — triggers upload flow from PR #67                      │
  │ • Table — inserts 3×2 markdown table scaffold                   │
  │ • Keyboard shortcuts displayed in tooltips                      │
  │ ⚠  Depends on PR #67 (image upload) being merged first         │
  └─────────────────────────────────────────────────────────────────┘

  PR #69  feat/enhanced-markdown-rendering                      ★ new feature
  ┌─────────────────────────────────────────────────────────────────┐
  │ Upgrades the post preview + public article rendering            │
  │ • Block quotes styled as pull quotes — left accent border,      │
  │   italic, indented, warm cream background                       │
  │ • Horizontal rules rendered as wide visual section separators   │
  │   with generous vertical spacing (not a thin HR line)           │
  │ • Tables — full styled rendering with alternating row shading   │
  │ • Task lists — ☑ / ☐ styled checkboxes (read-only on public    │
  │   article view)                                                 │
  │ • Syntax-highlighted code blocks — language label top-right,    │
  │   copy button (ties into PR #66)                                │
  │ • Footnotes — superscript refs, footnote list at article bottom │
  │ • Callout boxes — custom syntax  > [!NOTE] / [!WARNING] etc.   │
  │   rendered as coloured aside blocks                             │
  └─────────────────────────────────────────────────────────────────┘

  PR #70  feat/inline-link-tool                                 ★ new feature
  ┌─────────────────────────────────────────────────────────────────┐
  │ Custom-text inline links in the CodeMirror editor               │
  │                                                                 │
  │ • Toolbar "Link" button:                                        │
  │     - Text selected → prompt for URL → wraps as                 │
  │       [selected text](url)   e.g. "click here for more info"    │
  │     - No selection → inserts [custom text](url) with            │
  │       "custom text" pre-highlighted for immediate replacement   │
  │ • Paste a bare URL with text selected → auto-wraps              │
  │ • Paste a bare URL with no selection → inserts [url](url)       │
  │   with the display text portion pre-selected for editing        │
  │ • Cmd+K shortcut opens link prompt (standard convention)        │
  │ • No Prisma changes required                                    │
  └─────────────────────────────────────────────────────────────────┘

  PR #71  feat/short-permalinks                                  ★ new feature
  ┌─────────────────────────────────────────────────────────────────┐
  │ Short post URLs for easy sharing  (/p/[shortId])                │
  │                                                                 │
  │ STRATEGY: short ID always generated silently — the toggle       │
  │ controls visibility only, so shared links never break if an     │
  │ author later changes their preference.                          │
  │                                                                 │
  │ • Post.shortId String @unique — nanoid 8-char, set on creation  │
  │ • User.showShortLink Boolean @default(false)                    │
  │ • /p/[shortId] → 308 permanent redirect to /posts/[slug]        │
  │ • Canonical URL unchanged — always /posts/[slug]                │
  │                                                                 │
  │ Visibility:                                                     │
  │   • Dashboard post list: always shows short link for author     │
  │     (private reference, regardless of toggle)                   │
  │   • Profile settings: "Show short permalink on my posts" toggle │
  │   • Toggle ON → "Copy short link" button appears in the         │
  │     public post action bar alongside the existing copy button   │
  │   • Toggle OFF → short link hidden from readers; author still   │
  │     has it in their dashboard                                   │
  │                                                                 │
  │ ⚠  Prisma migration required (Post.shortId + User.showShortLink)│
  └─────────────────────────────────────────────────────────────────┘

  ── BATCH 5 · TipTap Editor Migration (isolated) ──────────────────────

  PR #72  feat/tiptap-editor                                    ★ migration
  ┌─────────────────────────────────────────────────────────────────┐
  │ Isolated branch — Vercel preview deployment for side-by-side    │
  │ comparison before any decision to merge                         │
  │                                                                 │
  │ STRATEGY: use tiptap-markdown extension throughout so TipTap    │
  │ reads/writes markdown strings — Post.content schema unchanged,  │
  │ all existing posts render correctly, migration is frontend-only │
  │                                                                 │
  │ • Install: @tiptap/react, @tiptap/starter-kit,                 │
  │   tiptap-markdown, + extension packages                         │
  │ • Port all toolbar actions from PR #68                          │
  │ • Port image upload integration from PR #67                     │
  │ • Port all content types from PR #69 (blockquote, table, etc.) │
  │ • Port autosave behaviour (debounced PATCH) from Phase 1        │
  │ • Port unsaved-changes warning from Phase 1                     │
  │ • Port word count + slug preview from Phase 1                   │
  │ • Full regression test: create, edit, preview, publish a post   │
  │                                                                 │
  │ OUTCOME: deploy preview branch → review UX → decide to merge   │
  │ or revert. CodeMirror version remains on main until decided.    │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋  IMPLEMENTATION PLAN  (recommended build order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BATCH 1  ·  SEO + Accessibility  (no Prisma, highest leverage)
  ──────────────────────────────────────────────────────────────
  Step 1  →  PR #57  fix/seo-meta           ← canonical URL + og:description + sitemap
  Step 2  →  PR #58  fix/accessibility      ← aria-labels + aria-controls

  BATCH 2  ·  Engagement + Retention
  ──────────────────────────────────────────────────────────────
  Step 3  →  PR #59  feat/prev-next-navigation    ← no Prisma
  Step 4  →  PR #60  feat/dashboard-post-stats    ← no Prisma
  Step 5  →  PR #61  fix/card-polish              ← no Prisma

  BATCH 3  ·  Polish + Discoverability
  ──────────────────────────────────────────────────────────────
  Step 6  →  PR #62  feat/reading-progress        ← no Prisma
  Step 7  →  PR #63  feat/footer                  ← no Prisma
  Step 8  →  PR #64  fix/search-empty-state       ← no Prisma
  Step 9  →  PR #65  feat/tags-page               ← no Prisma
  Step 10 →  PR #66  feat/code-block-copy         ← no Prisma

  BATCH 4  ·  Editor & Content Richness (CodeMirror 6)
  ──────────────────────────────────────────────────────────────
  Step 11 →  PR #67  feat/image-uploads-in-editor      ← no Prisma
  Step 12 →  PR #68  feat/rich-markdown-toolbar         ← depends on #67
  Step 13 →  PR #69  feat/enhanced-markdown-rendering   ← no Prisma, ties into #66
  Step 13 →  PR #69  feat/enhanced-markdown-rendering   ← no Prisma, ties into #66
  Step 14 →  PR #70  feat/inline-link-tool              ← no Prisma
  Step 15 →  PR #71  feat/short-permalinks              ← Prisma migration

  BATCH 5  ·  TipTap Migration (after all CodeMirror features are merged)
  ──────────────────────────────────────────────────────────────
  Step 16 →  PR #72  feat/tiptap-editor   ← isolated branch, Vercel preview only
                                            merge only if UX comparison favours TipTap

  Prisma migrations: 0 required in Batches 1–3. Batch 4: PR #71 only.
  Batch 5 has no Prisma changes — migration is purely frontend.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊  PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Merged  [░░░░░░░░░░░░░░░░░░░░]   0 / 16 PRs
  Open    [███░░░░░░░░░░░░░░░░░]   3 / 16 PRs  (#57 #58 #59)
  Pending [█████████████░░░░░░░]  13 / 16 remaining

  Batches 1–3: 10 PRs  ·  UI/UX refinements     ·  0 Prisma migrations
  Batch 4:      5 PRs  ·  Editor richness        ·  1 Prisma migration (PR #71)
  Batch 5:      1 PR   ·  TipTap migration       ·  isolated preview branch


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📝  CHANGE LOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2026-03-31  Phase 2 roadmap created — 10 PRs planned across 3 batches
  2026-03-31  Batch 4 added — editor richness (PRs #67–#71, CodeMirror 6)
                PR #70 feat/inline-link-tool: custom-text links with Cmd+K
                PR #71 feat/short-permalinks: /p/[shortId] with profile toggle
                Rich link unfurl cards moved to STRETCH_GOALS.md
              Batch 5 added — TipTap migration (PR #72, isolated preview branch)
              Total: 16 PRs across 5 batches · 1 Prisma migration (PR #71)
              STRETCH_GOALS.md created to accumulate future version ideas
