# Testing & Operations Guide

## 1. Local Development Setup

### 1.1 Prerequisites
- Node.js: >= 20.x
- npm: >= 10.x
- PostgreSQL database instance (or Supabase project)

### 1.2 Initial Setup
```bash
# 1. Install root and workspace dependencies
npm install

# 2. Generate Prisma client
npx prisma generate --schema=apps/api/prisma/schema.prisma

# 3. Start development servers concurrently (NestJS API on 3001, Next.js Web on 3000)
npm run dev
```

---

## 2. Environment Variables Catalog

> **CRITICAL SECURITY RULE:** Never commit or hardcode actual credentials, JWT secrets, or DB passwords. Only reference variable names.

### 2.1 Backend (`apps/api/.env` or root `.env`)

| Variable Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL pooled connection string for runtime queries | `postgresql://user:pass@host:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma migrations | `postgresql://user:pass@host:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous Supabase key | Client-safe JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase Admin API key for user provisioning | Server-only JWT |
| `SUPABASE_JWT_SECRET` | Secret used to verify incoming Supabase JWT tokens | String |
| `JWT_SECRET` | Fallback secret for local JWT signing | String |
| `PORT` | API listen port (defaults to 3001 if omitted) | `3001` |

### 2.2 Frontend (`apps/web/.env.local`)

| Variable Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the NestJS backend API | `http://localhost:3001` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous public Supabase key | Client-safe JWT |

---

## 3. Testing Commands

### 3.1 Unit Testing (Vitest)
Unit tests reside alongside source files (e.g. `apps/api/src/app.controller.spec.ts`).
```bash
# Run API unit test suite once
npm run test -w apps/api

# Run Vitest in watch mode during development
npm run test:watch -w apps/api

# Run tests with code coverage report
npm run test:cov -w apps/api
```

### 3.2 End-to-End Testing (Vitest + Supertest)
E2E tests reside in `apps/api/test/` (e.g. `security-workflow.e2e-spec.ts`).
```bash
# Run API end-to-end test suite
npm run test:e2e -w apps/api
```

### 3.3 Linting & Code Quality
```bash
# Run type-aware Oxlint on API
npm run lint -w apps/api

# Run Prettier code formatting
npm run format -w apps/api
```

---

## 4. Database Operations & Seeding

```bash
# Push schema changes to database (Development)
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Generate updated Prisma client after schema edit
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Run custom seed script with Supabase integration
node apps/api/prisma/custom-seed.js

# Run quick user upsert script
node apps/api/prisma/quick-seed.js
```

---

## 5. Production Build & Deployment (Render Blueprint)

The API is configured for deployment on the Render cloud platform via [`render.yaml`](../../render.yaml):

- **Service Type:** Web Service (Node.js runtime, Free tier)
- **Build Command:**
  ```bash
  npm install && npx prisma generate --schema=apps/api/prisma/schema.prisma && npm run build -w apps/api
  ```
- **Start Command:**
  ```bash
  npm run start:prod -w apps/api
  ```
- **Static Assets:** The API serves uploads from `process.cwd()/uploads` at the prefix `/uploads/`.
