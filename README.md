# Parchment Blog

A blog platform built with **Next.js, TypeScript, Prisma, and PostgreSQL**.

## Tech Stack

- **Frontend / App**: Next.js (App Router), React, TypeScript, TailwindCSS
- **Data**: PostgreSQL, Prisma ORM
- **State / Fetching**: TanStack React Query
- **Validation**: Zod
- **Infra (local)**: Docker Compose (Postgres)

---

## Getting Started (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog?schema=public"
NEXTAUTH_SECRET="dev-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Run migrations & generate Prisma client

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

### 6. Verify setup

Visit:

- `http://localhost:3000`
- `http://localhost:3000/api/health` → should return `{ ok: true }`

---

## Project Status

🚧 **In active development**
