# Parchment Blog

**Parchment Blog** is a modern blogging platform built with **Next.js, TypeScript, Prisma, and PostgreSQL**.

The project focuses on delivering a clean writing experience while maintaining a production-grade architecture with typed APIs, efficient data fetching, and scalable infrastructure.

---

## Features

### Authentication

- Secure session-based authentication
- User accounts with profile avatars
- Protected dashboard routes

### Writing & Publishing

- Create, edit, and delete posts
- Draft vs published workflow
- Personal dashboard for managing content

### Public Blog

- Public feed of published posts
- Individual post pages
- Reading time estimation
- View tracking

### Social Sharing

- Dynamic OpenGraph images generated per post
- Clean social preview cards when links are shared

### Performance

- Server-first architecture using the Next.js App Router
- Efficient database queries with Prisma
- Smart caching and revalidation strategies

---

## Tech Stack

**Frontend**

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

**Backend**

- PostgreSQL
- Prisma ORM
- Next.js Route Handlers

**Data & State**

- TanStack React Query
- Zod validation

**Infrastructure**

- Docker Compose for local PostgreSQL
- Vercel deployment
- AWS S3 for avatar storage

---

## Project Structure

    app/
      dashboard/        authenticated user dashboard
      posts/            public blog pages
      api/              route handlers
      components/       shared UI components

    lib/
      api/              client API utilities
      server/           server-side helpers
      validators/       Zod schemas

    prisma/
      schema.prisma     database schema

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

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog?schema=public"

NEXTAUTH_SECRET="dev-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

### 6. Verify setup

Visit:

http://localhost:3000

Health check endpoint:

http://localhost:3000/api/health

Expected response:

```json
{ "ok": true }
```

---

## Development Status

🚧 Active development

Planned improvements include:

- Rich text editor
- Comments
- Reactions
- Tags and search
- User profiles
- RSS feed

---

## Author

**Omer Siddiqui**

Software engineer focused on building clean, high-performance web applications.

GitHub: https://github.com/omersiddiqui  
Portfolio: https://omersiddiqui.com
