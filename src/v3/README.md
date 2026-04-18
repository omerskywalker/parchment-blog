# Parchment v3 (Experimental)

This directory contains the **v3 redesign** of Parchment, gated behind a runtime feature flag (`pref-v3` cookie). All code in this folder is experimental and should be treated as parallel to the production `main` experience.

## What lives here

- `HomePageV3.tsx` — alternate home page body (richer hero + value props)
- `PostDetailV3.tsx` — alternate post detail body (sticky ToC + Article JSON-LD)
- `AuthorProfileV3.tsx` — alternate profile body (Person JSON-LD + RSS subscribe link)
- `components/` — v3-only React components (FooterV3, TableOfContentsV3, HomeLatestPostsV3, PublicPostsFeedV3)
- `lib/excerpt.ts` — server helper that extracts a 160-char excerpt from markdown

## How it's wired in

The existing pages in `src/app/` fetch their data, then check `isV3Enabled()` from `src/lib/flags.ts` and render either the original component tree or the v3 equivalent from this folder. **No v3 code is imported anywhere outside its conditional branch.**

## How to toggle

- User-facing: visit `/?v3=on` (sets cookie) or `/?v3=off` (clears it)
- Global: set `v3Enabled` in Vercel Edge Config (see `docs/v3-feature-flags.md`)

## How to graduate v3 → default

When you decide v3 wins:

1. Replace the contents of the original component / page body with the v3 version
2. Delete this `src/v3/` folder
3. Delete `src/lib/flags.ts` and `middleware.ts` (or keep them for the next experiment)
4. Remove the conditionals from `src/app/`

The v3 code is intentionally self-contained to make this graduation a fast, mechanical operation.
