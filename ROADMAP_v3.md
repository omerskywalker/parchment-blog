# Parchment Blog — ROADMAP v3

Started: 2026-04-02
Status: Planning

All 24 items from the original code review are shipped (PRs #36–#55). This roadmap captures the next wave of improvements.

---

## Editor Affordances

The CodeMirror editor is a raw markdown input with no toolbar. Users must know markdown syntax to use advanced formatting. Planned upgrades:

| # | Feature | Notes |
|---|---------|-------|
| E1 | **Editor toolbar** | Floating or fixed bar: Bold, Italic, Heading, Blockquote, Code, Link, Divider buttons. Insert markdown syntax at cursor. |
| E2 | **Image upload in articles** | Toolbar button → file picker → S3 upload → inserts `![alt](url)` at cursor. Reuse avatar upload infra; add `/api/uploads/post-image` route. |
| E3 | **Block quote insert UI** | Toolbar button wraps selection or inserts `> ` prefix. |
| E4 | **Inline code / code block toggle** | Single-backtick for inline, triple-backtick with language selector for fenced blocks. |
| E5 | **Link insert dialog** | Small popover: text + URL fields → inserts `[text](url)`. |
| E6 | **Drag-and-drop image upload** | Drop image file onto editor → auto-upload to S3 → insert markdown. |

---

## Polish & UX

| # | Feature | Notes |
|---|---------|-------|
| P1 | **Reading time estimate** | Show "X min read" on post cards and article header. Derive from word count (avg 200 wpm). |
| P2 | **Table of contents** | Auto-generated from `##` headings, sticky sidebar on desktop for long articles. |
| P3 | **Copy code button** | Add copy-to-clipboard button on rendered fenced code blocks. |
| P4 | **Post reactions beyond fire** | Add 👏 or 💡 reaction options alongside fire. Requires schema change. |
| P5 | **Keyboard shortcuts in editor** | Cmd+B bold, Cmd+I italic, Cmd+K link, Cmd+Shift+8 list — standard editor shortcuts via CodeMirror keybindings. |

---

## Growth & Discovery

| # | Feature | Notes |
|---|---------|-------|
| G1 | **Tag pages** | `/tags/[tag]` — filtered post feed by tag. |
| G2 | **Follow authors** | User.following/followers relation. Feed tab showing followed-author posts. |
| G3 | **Newsletter / digest** | Weekly email digest of top posts to opted-in users via Resend. |
| G4 | **Comment threads** | Nested comments on posts. Requires Comment model in schema. |

---

## Infrastructure

| # | Feature | Notes |
|---|---------|-------|
| I1 | **Sitemap auto-rebuild** | Currently force-dynamic. Consider ISR or cron-triggered regeneration at scale. |
| I2 | **Prisma migrations on deploy** | Automate `prisma migrate deploy` in Vercel build step so it's never manual. |
| I3 | **Edge rate limiting** | Move Upstash rate limiting to Next.js middleware for earlier rejection. |

---

## Suggested Implementation Order

1. **E1 + E5** — Toolbar with bold/italic/heading/link (no uploads yet, lowest complexity)
2. **E3** — Blockquote button (trivial add-on to toolbar)
3. **E4** — Code block toggle
4. **E2 + E6** — Image uploads (needs new S3 route + toolbar integration)
5. **P1** — Reading time (quick win, high-visibility)
6. **P5** — Editor keyboard shortcuts
7. **P3** — Copy code button
8. **G1** — Tag pages
9. **P2** — Table of contents
10. **I2** — Automate prisma migrate deploy

---

## Not Planning (yet)
- Comments (high complexity, low urgency)
- Follow graph (needs significant schema + feed rework)
- Newsletter (nice-to-have, can use Resend when ready)
