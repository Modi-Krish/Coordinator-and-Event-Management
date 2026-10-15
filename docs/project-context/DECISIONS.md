# Architecture Decision Records (ADRs)

This document records the architectural and design decisions established in this repository.

---

## ADR-001: Monorepo Organization using npm Workspaces

- **Date:** October 2026
- **Status:** Accepted
- **Context:** The system requires tight coordination between a NestJS backend and a Next.js frontend sharing data structures, deployment workflows, and development tooling.
- **Decision:** Use native npm workspaces configured in root `package.json` (`apps/*`, `packages/*`), orchestrated by `concurrently` for root development.
- **Alternatives Considered:** Turborepo, Nx, separate Git repositories.
- **Consequences:** Lightweight setup without heavy build orchestrator overhead. Build commands use `--workspaces --if-present`.
- **Affected Modules:** Root, `apps/api`, `apps/web`.

---

## ADR-002: Dual-Tier Identity Strategy (Supabase Auth + Local Prisma Profile)

- **Date:** October 2026
- **Status:** Accepted
- **Context:** Secure password hashing, MFA, and token issuance are complex and risk-prone to manage entirely in-house, but rich relational models (roles, designations, team hierarchy) are required for domain logic.
- **Decision:** Delegate authentication and password validation to Supabase GoTrue Auth. Store the public user profile, roles, and hierarchy in the PostgreSQL `User` table keyed by the Supabase UUID (`authData.user.id`). Validate sessions via Passport JWT strategy against `SUPABASE_JWT_SECRET`.
- **Alternatives Considered:** Full custom bcrypt + JWT in NestJS, NextAuth.js.
- **Consequences:** Eliminates password storage vulnerabilities; requires synchronization between Supabase user creation and PostgreSQL public profile creation.
- **Affected Modules:** `AuthModule`, `UsersModule`.

---

## ADR-003: Hybrid Event-Driven Communication with Socket.io

- **Date:** October 2026
- **Status:** Accepted
- **Context:** The platform requires instant notification delivery, live GPS tracking, and low-latency WebRTC signaling alongside traditional CRUD operations.
- **Decision:** Implement Socket.io via `@nestjs/websockets` and `@nestjs/platform-socket.io`. Restrict HTTP controllers to CRUD mutations and trigger WebSocket broadcasts (`issue:new`, `issue:updated`, `location:update`) within domain service methods.
- **Alternatives Considered:** Server-Sent Events (SSE), standard WebSocket (`ws`), polling.
- **Consequences:** Provides out-of-the-box room routing (`user:*`, `role:*`, `managers_of:*`), automatic reconnects, and seamless WebRTC signaling transport.
- **Affected Modules:** `RealtimeModule`, `IssuesModule`, `CallsModule`, `NotificationsModule`.

---

## ADR-004: Automated Round-Robin Coordinator Dispatch

- **Date:** October 2026
- **Status:** Accepted
- **Context:** Citizen reports often arrive without prior knowledge of which coordinator is on duty, causing tickets to languish in unassigned queues.
- **Decision:** Automatically dispatch newly reported issues (`type === 'ISSUE'`) to active `STAFF` members holding the `COORDINATOR` designation using round-robin sequence based on the last assigned issue.
- **Alternatives Considered:** Manual manager dispatch, geographic nearest-neighbor dispatch.
- **Consequences:** Instant task assignment without managerial bottlenecks; equal workload distribution across field staff.
- **Affected Modules:** `IssuesModule`.

---

## ADR-005: Local MapLibre Worker to Eliminate Edge CDN CORS Latency

- **Date:** October 2026
- **Status:** Accepted
- **Context:** MapLibre GL web workers loaded from external unpkg/cdnjs CDNs trigger strict browser CORS errors and security blocks on certain networks and environments.
- **Decision:** Host the MapLibre web worker directly in the Next.js public directory (`/public/maplibre-worker.mjs`) and configure `maplibregl.setWorkerUrl("/maplibre-worker.mjs")`.
- **Alternatives Considered:** Data URL worker inlining, external CDN proxy.
- **Consequences:** Zero external network dependency for worker scripts, 100% reliable local and production map initialization.
- **Affected Modules:** `apps/web/src/app/page.tsx`, `apps/web/src/app/map/page.tsx`.

---

## ADR-006: Local Storage Service Abstraction with Factory Provider

- **Date:** October 2026
- **Status:** Accepted
- **Context:** The platform needs file attachment storage for issue photos. Local disk storage is easiest for development and free-tier single-node deployments, but cloud storage is required for horizontal scaling.
- **Decision:** Define an abstract interface `IStorageService` and inject it using a DI token `STORAGE_SERVICE`. Provide `LocalStorageService` saving to `/uploads` as the default implementation.
- **Alternatives Considered:** Tightly binding Multer disk storage in controller routes.
- **Consequences:** Allows hot-swapping to an S3 or Google Cloud Storage provider without altering any service logic in `IssuesService`.
- **Affected Modules:** `StorageModule`, `IssuesModule`.
