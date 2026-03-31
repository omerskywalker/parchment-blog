# Parchment

**Parchment** is a minimalist blogging platform for independent writers. No algorithmic feeds, no engagement traps — just your words, published cleanly to the web.

Built with a production-grade architecture: server-first rendering, typed end-to-end, real-time social signals, full-text search, and a distraction-free markdown editor.

**Live:** [parchment-blog.vercel.app](https://parchment-blog.vercel.app)

---

## Vision

Most blogging platforms bury your writing behind recommendations, metrics dashboards, and follower counts designed to keep you on the platform. Parchment strips all of that away.

The reader sees your post. The writer sees a markdown editor. Everything else — auth, scheduling, tags, reactions, SEO — exists to serve those two interactions without getting in the way.

---

## Features

### Authentication
- Email/password registration with username
- OAuth login via **Google** and **GitHub** (account linking supported)
- Email verification (Resend-powered, required before publishing)
- Password reset via email link
- Rate-limited auth endpoints (Upstash Redis sliding window)

### Writing & Editor
- **CodeMirror 6** markdown editor with syntax highlighting
- Live **Write / Preview** toggle
- Real-time word count
- Tag management via pill input (Enter or comma to add)
- Slug auto-generation from title (fully editable)
- Live slug preview showing final URL
- **Autosave** — 3-second debounce, persisted via API
- Unsaved changes warning (browser `beforeunload`)
- Post deletion with confirmation modal

### Publishing Workflow
- Draft → Published toggle with one click
- **Scheduled publishing** — pick a publish date; posts go live at 9 AM UTC via daily cron
- **Auto-publish mode** per user (creates posts as published immediately on save with a brief undo window)
- Publish / unpublish at any time post-creation

### Public Feed & Discovery
- Paginated public post feed (cursor-based, 10 per page, infinite scroll)
- **Full-text search** powered by PostgreSQL `tsvector` — searches title and content
- **Tag filtering** on the public feed
- **Related posts** by tag overlap below each article (up to 3)
- **Prev / Next post navigation** at the bottom of every article (same-author first, then global)
- Per-author profile pages (`/u/[username]`) with bio and post history

### Social & Engagement
- **Fire reactions** — one per visitor per post, tracked via anonymous visitor cookie
- Fire milestone email notifications (at 5, 25, and 100 fires) — idempotent, never double-sends
- **View tracking** — incremented on each page load
- Share actions: Copy link, Post to X, native Web Share API (with copy fallback)
- Post stats bar showing fire count and view count inline

### SEO & Distribution
- **Dynamic OpenGraph images** (1200×630) generated per post — includes title, author avatar, fire count, view count, and reading time
- Twitter / X `summary_large_image` card
- Meta description extracted from the first paragraph of post content
- Canonical URL pinned via `NEXT_PUBLIC_SITE_URL`
- **RSS feed** at `/rss.xml` — 50 latest posts, standard RSS 2.0 with Atom self-link and category tags
- **XML sitemap** at `/sitemap.xml` covering all published posts and static routes
- Reading time estimation (~200 words/minute)

### User Profiles
- Bio (up to 280 characters)
- Custom avatar upload direct to **AWS S3** via presigned URL (PNG, JPEG, WebP)
- Username (unique, shown on post detail and profile pages)
- Auto-publish preference toggle

### Accessibility
- Semantic HTML (`article`, `main`, `nav`)
- ARIA labels on all icon-only buttons (`aria-label`, `aria-pressed`, `aria-controls`, `aria-expanded`)
- Proper heading hierarchy
- Loading skeletons (editor, post cards, post list, profile)
- Error boundary component

### Performance & Observability
- `unstable_cache` on public post feeds — 60-second revalidation, on-demand tag invalidation on publish
- Cursor-based pagination for efficient large-dataset queries
- **Vercel Analytics** and **Speed Insights**
- **Sentry** error tracking (server and edge)

---

## Tech Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16 | App Router, RSC, API routes, OG image generation |
| **React** | 19 | UI rendering |
| **TypeScript** | 5 (strict) | End-to-end type safety |

### Database & ORM
| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | — | Primary database |
| **Prisma** | 6 | ORM, migrations, type-safe queries |

### Auth
| Technology | Purpose |
|---|---|
| **NextAuth v4** | Session management, JWT strategy, OAuth |
| **bcryptjs** | Password hashing |
| **jose** | JWT token creation for email verification and password reset |

### UI & Styling
| Technology | Purpose |
|---|---|
| **Tailwind CSS v4** | Utility-first styling |
| **@tailwindcss/typography** | Prose styling for rendered markdown |
| **Geist / Geist Mono** | Fonts (via `next/font`) |

### Editor & Markdown
| Technology | Purpose |
|---|---|
| **CodeMirror 6** (`@uiw/react-codemirror`) | Markdown editor with syntax highlighting |
| **@codemirror/lang-markdown** | Markdown language support |
| **@codemirror/theme-one-dark** | Editor theme |
| **react-markdown** | Rendering markdown to HTML |
| **remark-gfm** | GitHub-Flavored Markdown (tables, strikethrough, etc.) |

### Data Fetching & State
| Technology | Purpose |
|---|---|
| **TanStack React Query v5** | Client-side data fetching, caching, optimistic updates |
| **Zod v4** | Runtime schema validation |

### Infrastructure & Services
| Technology | Purpose |
|---|---|
| **AWS S3** (`@aws-sdk/client-s3`) | Avatar storage, presigned uploads |
| **Upstash Redis** (`@upstash/redis`, `@upstash/ratelimit`) | Rate limiting on auth endpoints |
| **Resend** | Transactional email (verification, password reset, fire notifications) |
| **Sentry** (`@sentry/nextjs`) | Error tracking |
| **Vercel** | Hosting, preview deployments, cron jobs |
| **Vercel Analytics / Speed Insights** | Performance and traffic observability |

### Testing & Tooling
| Technology | Purpose |
|---|---|
| **Vitest** | Unit tests |
| **ESLint** | Linting |
| **Prettier** | Code formatting (with Prisma and Tailwind plugins) |
| **Docker Compose** | Local PostgreSQL |

---

## Database Schema

```
User              — email, username, bio, avatarKey, autoPublish, OAuth accounts
Post              — title, slug, contentMd, tags[], publishedAt, scheduledAt, viewCount, fireCount
PostReaction      — visitor-scoped fire reactions (unique per postId + visitorId + kind)
FireNotification  — idempotent milestone tracking (5, 25, 100 fires per post)
Account           — NextAuth OAuth provider records
Session           — NextAuth sessions
VerificationToken — email verification tokens
PasswordResetToken — password reset tokens (hashed, expiring)
```

---

## Project Structure

```
src/
  app/
    (auth)/           sign in, register, forgot/reset password, verify email
    dashboard/        authenticated user routes (posts, profile)
    posts/            public post feed and detail pages
    u/[username]/     public author profile pages
    components/       shared UI components
    api/              all route handlers

  lib/
    api/              client-side API wrappers (React Query-friendly)
    server/           server-only helpers (Prisma queries, email, caching)
    hooks/            React hooks (useUnsavedWarning, useDebounce, useLocalDraft)
    validators/       Zod schemas

prisma/
  schema.prisma       database schema and migrations
```

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Required for core functionality:**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/blog?schema=public"

# NextAuth
NEXTAUTH_SECRET="dev-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Cron security
CRON_SECRET="dev-cron-secret"
```

**Optional (features degrade gracefully if absent):**

```env
# OAuth — enables Google/GitHub login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=

# Email — verification, password reset, fire notifications
RESEND_API_KEY=

# Avatar uploads
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Rate limiting
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Error tracking
SENTRY_AUTH_TOKEN=
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Health check:** [http://localhost:3000/api/health](http://localhost:3000/api/health) → `{ "ok": true }`

### 6. Run tests

```bash
npm test
```

---

## Architecture Notes

**Caching** — Public post feeds use Next.js `unstable_cache` with a 60-second TTL and named cache tags. Publishing or unpublishing a post calls `revalidateTag` to bust only the relevant entries.

**Search** — Full-text search uses PostgreSQL's native `tsvector` / `plainto_tsquery` on title and content. Results are ranked by relevance. Input is sanitized server-side before query construction.

**Pagination** — The public feed uses cursor-based pagination (post ID as cursor) rather than offset pagination, keeping queries efficient as the dataset grows.

**Reactions** — Fire reactions are visitor-scoped using an anonymous `pb_vid` cookie (httpOnly, 1-year expiry, path `/`). Stored in `PostReaction` with a unique constraint on `(postId, visitorId, kind)` to prevent duplicates at the database level.

**Scheduled publishing** — Posts with a future `scheduledAt` are picked up by a Vercel Cron job (`0 9 * * *` — 9 AM UTC daily). The job sets `publishedAt = scheduledAt`, clears `scheduledAt`, and revalidates the relevant cache tags.

**Email** — All email sending is fire-and-forget (never blocks an API response). If `RESEND_API_KEY` is absent, the server logs a dev-friendly preview link instead.

**Rate limiting** — Auth endpoints are protected with Upstash Redis sliding-window rate limits. If Redis is unreachable, requests are allowed through (fail open) to avoid outages.

---

## Author

**Omer Siddiqui**

GitHub: [omerskywalker](https://github.com/omerskywalker)
