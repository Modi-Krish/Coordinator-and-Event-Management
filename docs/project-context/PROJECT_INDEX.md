# Project Context Index

**Repository:** `realtime-coordinator-system` (Coordinator & Issue Management Platform)  
**Last Verified Revision:** `0f3dc50` (Main Branch)  
**Documentation Version:** 1.0.0 (October 2026)  

---

## 1. Project Identity & Purpose

The **Real-Time Coordinator and Issue Management System** is a mission-critical platform designed for campus, municipal, and institutional field operations. It enables citizens and staff to report localized civic and infrastructure issues, automates round-robin coordinator dispatch, tracks personnel live via GPS coordinates on interactive maps, supports WebRTC encrypted voice/video communication, and enforces automated two-hour hierarchical manager escalations.

---

## 2. Verified Technology Stack

| Tier | Technologies | Primary Roles |
| :--- | :--- | :--- |
| **Monorepo** | npm Workspaces (`apps/*`, `packages/*`), concurrently | Root orchestration |
| **Backend API** | NestJS v12, Express, TypeScript v6 | REST controllers, business logic, cron scheduling |
| **Database & ORM**| PostgreSQL, Prisma ORM v5, Supabase | Relational data persistence, pooler/direct connection |
| **Authentication** | Supabase Auth (Admin API), Passport JWT Strategy | External identity verification, JWT authorization |
| **Real-Time & WS** | Socket.io v4 (`@nestjs/websockets`, `@nestjs/platform-socket.io`) | Live issue sync, GPS tracking, WebRTC signaling |
| **Background Engine** | NestJS Schedule (`@nestjs/schedule`) | Periodic 30-min SLA escalation cron |
| **File Storage** | Local Multipart/Multer (`LocalStorageService`) | Media attachments saved to `/uploads` directory |
| **Frontend Web** | Next.js 16 (App Router), React 19, Tailwind CSS v4 | Interactive SPA & dashboards |
| **Mapping & GIS** | MapLibre GL v6, `react-map-gl` v8 | High-performance hardware-accelerated live map |
| **Testing & Lint** | Vitest v4, Supertest v7, Oxlint v1.58, Prettier | Unit/E2E test runners, type-aware linting |

---

## 3. Persistent Knowledge Base Directory

| Context Document | Purpose & Contents |
| :--- | :--- |
| **[`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)** | Problem statement, user personas, roles, capabilities, and system boundaries. |
| **[`ARCHITECTURE.md`](ARCHITECTURE.md)** | System topology, data flow, WebSocket room routing, WebRTC signaling, and Mermaid diagrams. |
| **[`REPOSITORY_MAP.md`](REPOSITORY_MAP.md)** | Directory tree, workspace boundaries, entry points, and source file responsibilities. |
| **[`FEATURE_CATALOG.md`](FEATURE_CATALOG.md)** | Comprehensive feature inventory (Dashboard, Issues, Tasks, Map, Comms, Hierarchy). |
| **[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)** | Prisma models, PostgreSQL relations, enums, indexes, constraints, and ER diagram. |
| **[`API_REFERENCE.md`](API_REFERENCE.md)** | REST endpoints, WebSocket event contracts, payloads, and authorization rules. |
| **[`BUSINESS_RULES.md`](BUSINESS_RULES.md)** | Core business logic, round-robin rules, supervisor verification gates, and IDOR prevention. |
| **[`WORKFLOWS.md`](WORKFLOWS.md)** | End-to-end lifecycle flows: Issue report-to-verify, escalation, calls, and location sync. |
| **[`TESTING_AND_OPERATIONS.md`](TESTING_AND_OPERATIONS.md)** | Test commands, local runtime execution, environment variable catalog, and Render deployment. |
| **[`DEPENDENCIES_AND_INTEGRATIONS.md`](DEPENDENCIES_AND_INTEGRATIONS.md)** | Third-party services, package inventories, and compatibility constraints. |
| **[`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)** | Confirmed bugs, technical debt, and pending optimizations. |
| **[`DECISIONS.md`](DECISIONS.md)** | Architecture Decision Records (ADRs) tracking significant system decisions. |
| **[`CHANGELOG.md`](CHANGELOG.md)** | Engineering changelog tracking project iterations and Git history. |
| **[`CURRENT_STATE.md`](CURRENT_STATE.md)** | Current verified operational status, passing test metrics, and active blockers. |
| **[`CONTEXT_CHANGELOG.md`](CONTEXT_CHANGELOG.md)** | Audit log of modifications to this documentation system. |
| **[`FILE_OWNERSHIP_MAP.md`](FILE_OWNERSHIP_MAP.md)** | Direct mapping of technical responsibilities to source files for fast selective retrieval. |

---

## 4. Key Entry Points & Runtime Locations

- **API Entry Point:** `apps/api/src/main.ts` (Listens on port `3001` or `PORT`)
- **API Root Module:** `apps/api/src/app.module.ts`
- **Frontend Entry Layout:** `apps/web/src/app/layout.tsx`
- **Frontend Dashboard:** `apps/web/src/app/page.tsx`
- **Prisma Schema:** `apps/api/prisma/schema.prisma`
- **WebSocket Gateway:** `apps/api/src/realtime/realtime.gateway.ts`

---

## 5. Verification Commands

```bash
# Run API Unit Tests (Vitest)
npm run test -w apps/api

# Run API Linter (Oxlint)
npm run lint -w apps/api

# Start Full Stack in Watch Mode
npm run dev
```

---

## 6. How to Selectively Retrieve Context

When assigned a task, **do not read the entire repository**:
1. Check **[`FILE_OWNERSHIP_MAP.md`](FILE_OWNERSHIP_MAP.md)** to find the exact source files and their documented counterparts.
2. Read the relevant section in **[`FEATURE_CATALOG.md`](FEATURE_CATALOG.md)** or **[`API_REFERENCE.md`](API_REFERENCE.md)**.
3. Review **[`BUSINESS_RULES.md`](BUSINESS_RULES.md)** to guarantee no invariants are breached.
4. Modify the code and update the corresponding documentation files listed above.
