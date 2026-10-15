# Engineering Changelog

This changelog records verified software modifications, architectural milestones, and fixes committed to the repository.

---

## [Unreleased / Recent Iterations] — October 2026

### Role Permissions, Automatic Issue Distribution, Task Assignment & Live Location
- **Summary:** Implemented complete 6-tier designation RBAC & hierarchy system (`Student`, `Coordinator`, `Core Member`, `Intern`, `Faculty`, `Manager`), atomic concurrency-safe round-robin cursor, task assignment permission matrix, explicit coordinator location sharing controls, and telemetry staleness detection.
- **Backend Changes:**
  - Added `AuthorizationService` enforcing task assignment, issue assignment, location viewing, and supervisor verification boundaries.
  - Added `DesignationsGuard` and `@Designations()` decorator; updated `JwtAuthGuard` to pass user designations.
  - Added `RoundRobinCursor` model to Prisma schema with atomic transaction cursor cycling and unassigned queue fallback.
  - Added `locationSharingEnabled` and `lastLocationAt` to `User` model; added `PATCH /users/me/location-sharing` and `GET /users/team-locations`.
  - Updated `RealtimeGateway` to enforce location-sharing state and reject broadcasts when sharing is disabled.
  - Added 23 unit tests across 4 test suites verifying round-robin cycling (1→2→3→1→2→3), direct assignment precedence, coordinator task restrictions, and staleness detection.
- **Frontend Changes:**
  - Created `LocationSharingControl.tsx` with start/stop toggle, browser permission handling, and real-time status.
  - Created `useCurrentUser.ts` hook with designation awareness and permission predicates (`canAssignTasks`, `canVerifyIssues`, `isCoordinator`).
  - Redesigned `tasks/page.tsx` to fix supervisor check bug, hide Create/Assign task modals from Coordinators, and scope assignees.
  - Updated `page.tsx` (Dashboard) and `map/page.tsx` (Live Map) to display role designations, hide unauthorized assignment buttons, eliminate unintended auto-tracking, and render live/stale telemetry indicators.
- **Outcome:** Full compliance with the role permission specifications and invariants across frontend and backend.

### Commit `0f3dc50`: Fix MapLibre Worker CORS Error
- **Summary:** Served MapLibre worker script locally from `/public/maplibre-worker.mjs` and configured `maplibregl.setWorkerUrl`.
- **Reason:** Prevented cross-origin errors when loading worker threads from external CDNs.
- **Affected Modules:** `apps/web/src/app/page.tsx`, `apps/web/src/app/map/page.tsx`.
- **Outcome:** Live vector map initializes without CSP or CORS console errors.

### Commit `457907a`: Fix AuthProvider Loading Hang on LocalStorage Error
- **Summary:** Added safe try/catch wrapper and finally block to `AuthProvider` initialization.
- **Reason:** Corrupted localStorage or disabled browser storage caused an infinite loading spinner.
- **Affected Modules:** `apps/web/src/components/AuthProvider.tsx`.
- **Outcome:** Clean fallback to login screen if localStorage is corrupted or inaccessible.

### Commit `8845bd1` & `a3598f9`: Fix Render Deployment & Build Scripts
- **Summary:** Updated root build scripts, tsconfig options, and `render.yaml` to run `npx prisma generate` during build.
- **Reason:** Resolved missing Prisma client types during Render cloud production builds.
- **Affected Modules:** `render.yaml`, `package.json`, `apps/api/package.json`.

### Commit `1e7b8f3`: Add Backwards Compatibility for Legacy JWT Tokens
- **Summary:** Updated JWT strategy to accept legacy and Supabase token payload formats.
- **Reason:** Prevented 401s during user migration to Supabase Auth.
- **Affected Modules:** `apps/api/src/auth/jwt.strategy.ts`.

### Commit `ac7a293` & `4562152`: Separate Tasks and Issues Dashboards with Type Filtering
- **Summary:** Implemented type-based segregation (`type=ISSUE` vs `type=TASK`) with dedicated dashboard views (`/issues` and `/tasks`).
- **Reason:** Separated operational coordinator tasks from public citizen incident reports.
- **Affected Modules:** `apps/web/src/app/issues/page.tsx`, `apps/web/src/app/tasks/page.tsx`, `apps/api/src/issues/issues.controller.ts`.

### Commit `3b02fa4`: High-Fidelity Glassmorphism Landing Page
- **Summary:** Added rich responsive marketing page at `/landing` featuring glassmorphism cards and typography.
- **Affected Modules:** `apps/web/src/app/landing/page.tsx`.

### Commit `57da76b`: Hierarchical Assignment for Managers
- **Summary:** Allowed administrators and supervisors to specify `reportingManagerId` when creating subordinates in `POST /users`.
- **Reason:** Enabled dynamic organization tree assignment.
- **Affected Modules:** `apps/api/src/users/users.controller.ts`, `apps/api/src/users/users.service.ts`.

### Commit `062e142`: Add AuditLog to Prisma Schema
- **Summary:** Added `AuditLog` entity to Prisma schema with action, entityType, entityId, actorId, oldValues, newValues.
- **Affected Modules:** `apps/api/prisma/schema.prisma`.

### Commit `ed7c77b`: Real-Time Synchronization & Escalation Engine
- **Summary:** Implemented `RealtimeGateway` with Socket.io and `@nestjs/schedule` escalation cron for overdue issues (> 2 hours).
- **Affected Modules:** `apps/api/src/realtime/`, `apps/api/src/escalation/`.
