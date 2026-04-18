# V3 Feature Flag System

This doc explains how the v3 redesign is gated behind a feature flag, how to toggle it, and how to graduate it once you're happy with it.

---

## TL;DR

- **v3 is OFF by default** in production. Visitors see the original Parchment experience.
- **Opt in for one user**: share the link `https://parchment.blog/?v3=on`. That user gets v3 forever (cookie-based).
- **Opt out for one user**: `https://parchment.blog/?v3=off`.
- **Global kill-switch / gradual rollout**: set `v3Enabled` in Vercel Edge Config (no redeploy required).
- **Confirm what's happening**: hit `/api/flags` (debug endpoint described below) to see the resolved state for the current request.

---

## What v3 changes (when ON)

| Surface | OFF (default) | ON (v3) |
|---|---|---|
| Home page hero | Simple title + tagline + 1 CTA | Richer hero, dual CTA, 3 value-prop cards |
| Home post cards | Title + meta | Title + 2-line excerpt + meta |
| Footer | None | Full footer with brand, RSS link, copyright |
| Post detail | Single column article | Two-column on `xl`: article + sticky Table of Contents |
| Post detail SEO | Standard `Article` OG tags | Adds full JSON-LD `Article` schema |
| Author profile | Standard layout | Adds JSON-LD `Person` schema + RSS subscribe link |

Security headers, the Playwright test suite, and other infrastructure improvements are **always on** — they're not part of the visual A/B test.

---

## How the flag is resolved

On every request, the server runs `isV3Enabled()` from `src/lib/flags.ts`. It returns `true`/`false` based on this priority order:

1. **Cookie `pref-v3=1`** → `true` (user has explicitly opted in)
2. **Cookie `pref-v3=0`** → `false` (user has explicitly opted out)
3. **Vercel Edge Config `v3Enabled`** → `true`/`false` (global default for everyone without a cookie)
4. **Hard-coded fallback** → `false` (used when Edge Config is not configured or unreachable)

**Cookie wins over Edge Config.** This is intentional: a user who opted in via your share link keeps seeing v3 even if you flip Edge Config off, and vice versa.

---

## How users get the cookie

`middleware.ts` runs on every page request. When it sees `?v3=on` or `?v3=off` in the URL, it:

1. Sets the `pref-v3` cookie (1 year, `SameSite=Lax`, `Secure` in production)
2. Redirects to the same URL with the `?v3=` param stripped (so the address bar stays clean and the user can bookmark normally)

Any request without `?v3=` passes through the middleware untouched (no perf cost beyond a single matcher check).

The cookie is **not** `HttpOnly` so client code could read it for a future "you're seeing v3" debug banner, if you want one.

---

## Toggling for individual users

Send these links however you want — Twitter, Discord, email, in-app banner:

| Action | URL |
|---|---|
| Opt in | `https://parchment.blog/?v3=on` |
| Opt out | `https://parchment.blog/?v3=off` |

Works on any page, not just `/`. For example, `https://parchment.blog/posts?v3=on` opts the user in and lands them on the posts page.

Users can clear their preference by clearing browser cookies or visiting `?v3=off`.

---

## Setting up Vercel Edge Config (for the global toggle)

This is **optional**. Without Edge Config, the system falls back to "off by default" and only honors per-user cookies. With Edge Config, you get a no-redeploy global toggle and the option to add percentage-based rollout later.

### Step 1: Create an Edge Config in Vercel

1. Go to **Vercel Dashboard → Storage → Create Database → Edge Config**
2. Name it something like `parchment-flags`
3. Click **Connect Project** and connect it to your `parchment-blog` project
4. Vercel automatically injects an `EDGE_CONFIG` env var (a connection string) into your project's Production, Preview, and Development environments

### Step 2: Install the SDK

```bash
npm install @vercel/edge-config
```

(This is loaded lazily by `src/lib/flags.ts`, so the build won't break if you skip this — Edge Config will just be silently ignored.)

### Step 3: Set the flag value

In the Vercel Dashboard, go to your Edge Config → **Items** tab → Add an item:

- **Key**: `v3Enabled`
- **Value**: `false` (start off — let users opt in via cookies)

### Step 4: Re-deploy once

After the env var is added, trigger one redeploy so the build picks up `EDGE_CONFIG`. From then on, flipping the value in the dashboard takes effect within seconds — no rebuild required.

### Step 5 (later, when you want to roll out): flip to `true`

Change the value to `true` in Edge Config. Now everyone without a cookie sees v3. Users who had explicitly opted out (cookie = `0`) still see the old experience, which is the polite behavior.

---

## Verifying the current state — debug endpoint

If you want to add a quick debug endpoint to inspect what the resolver is doing, drop this at `src/app/api/flags/route.ts`:

```ts
import { describeFlagState } from "@/lib/flags";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(await describeFlagState());
}
```

Then `curl https://parchment.blog/api/flags` returns:

```json
{
  "resolved": false,
  "source": "hard-default",
  "cookie": null,
  "edgeConfigValue": null,
  "edgeConfigConfigured": false,
  "hardDefault": false
}
```

Useful when troubleshooting "why am I (not) seeing v3?".

---

## Rollout playbook

A safe phased rollout:

1. **Week 0** — Merge `feat/v3-flag-system` to `main`. v3 is off by default. Share `?v3=on` link with ~10 trusted users for feedback.
2. **Week 1** — Address any bugs. Push fixes (still goes through the v3 components in `src/v3/`).
3. **Week 2** — Set up Edge Config. Keep `v3Enabled = false`.
4. **Week 3** — Flip `v3Enabled = true` for a few hours during a low-traffic window. Watch error rates / Vercel Analytics. Flip back if anything looks off.
5. **Week 4** — Leave `v3Enabled = true` permanently. Monitor for a week.
6. **Week 5+** — Graduate (see below).

---

## Future enhancement: percentage rollout

If you want to do a "10% of users see v3" experiment instead of a global on/off, store a percentage in Edge Config and hash a stable per-user identifier in the resolver. Sketch:

```ts
// In src/lib/flags.ts
const percent = await get<number>("v3Percent"); // e.g. 10 for 10%
const userId = cookieStore.get("anon-id")?.value ?? crypto.randomUUID();
const bucket = parseInt(userId.slice(0, 8), 16) % 100;
return bucket < percent;
```

This is a future enhancement — out of scope for the initial flag.

---

## Graduating v3 → default

When v3 is the experience you want everyone on, do this in one PR:

1. Move all files from `src/v3/` into their permanent homes in `src/app/` (e.g. `src/v3/components/FooterV3.tsx` → `src/app/components/Footer.tsx`)
2. Update imports in the page-level entry points
3. Delete the conditional branches in `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/posts/[slug]/page.tsx`, `src/app/u/[username]/page.tsx` — keep only the v3 path
4. Delete `src/lib/flags.ts`, `middleware.ts`, `docs/v3-feature-flags.md`
5. Optionally remove the `EDGE_CONFIG` env var from Vercel and uninstall `@vercel/edge-config`

The v3 code was intentionally written to be self-contained inside `src/v3/` so this graduation is a mechanical move + delete operation, not a refactor.

---

## Files involved

```
src/
├── lib/flags.ts                     ← the resolver (server-only)
├── v3/                              ← all new code, isolated
│   ├── README.md
│   ├── HomePageV3.tsx
│   ├── PostDetailV3.tsx
│   ├── AuthorProfileV3.tsx
│   ├── components/
│   │   ├── FooterV3.tsx
│   │   ├── HomeLatestPostsV3.tsx
│   │   └── TableOfContentsV3.tsx
│   └── lib/excerpt.ts
└── app/                             ← existing pages, with one-line conditionals
    ├── page.tsx                     ← if (v3) return <HomePageV3 />
    ├── layout.tsx                   ← {v3 && <FooterV3 />}
    ├── posts/[slug]/page.tsx        ← if (v3) return <PostDetailV3 />
    └── u/[username]/page.tsx        ← if (v3) return <AuthorProfileV3 />

middleware.ts                        ← reads ?v3= and writes the cookie
docs/v3-feature-flags.md             ← this file
```
