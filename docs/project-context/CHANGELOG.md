# Engineering Changelog

This changelog records verified software modifications, architectural milestones, and fixes committed to the repository.

---

## [Unreleased / Recent Iterations] — October 2026
 
### Comprehensive Website Responsive Optimization & Production Hardening
- **Summary:** Conducted repository-wide responsive hardening across all 8 routes (`/`, `/issues`, `/tasks`, `/report`, `/map`, `/team`, `/calls`, `/landing`), modals, layouts, and interactive components for all standard viewports (320px, 375px, 430px, 600px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px).
- **Core Architecture & Navigation:**
  - Removed blanket `overflow-x: hidden` from body to eliminate concealment of layout defects; implemented true flex/grid responsive constraints with `min-w-0`.
  - Added fluid responsive padding to `.crypto-card` and `.glass-card` (`p-5 sm:p-6 lg:p-8`), eliminating severe content truncation on small displays.
  - Fixed `.crypto-input` bug where textareas were artificially forced to `3rem` height; supported multi-line auto-expansion (`min-h-[5.5rem]`).
  - Added complete mobile navigation architecture to `Sidebar.tsx`: sticky mobile header (< 768px) with socket connectivity status, notification trigger, user initials chip, and touch-target hamburger toggle; sliding drawer overlay with route navigation, location sharing toggle, and logout button.
  - Positioned notifications overlay adaptively across desktop (`left-64 w-80`) and mobile (`inset-x-3 sm:right-4 max-w-sm`).
- **Dashboard & Feature Pages:**
  - `page.tsx` (Dashboard): Staggered KPI grid columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), fluid heading typography (`text-2xl sm:text-4xl md:text-5xl`), responsive map container height (`h-[340px] sm:h-[420px] lg:h-[500px]`), and touch-optimized side panels.
  - `issues/page.tsx` & `tasks/page.tsx`: Implemented dual-view responsive layout: desktop data table (>= 768px) with horizontal scroll containment and mobile card stack (< 768px) with accessible touch buttons (>= 44x44px), status selectors, and priority dropdowns.
  - `tasks/page.tsx` Modals: Constrained `CreateTaskModal` and `AssignTaskModal` with `max-h-[90dvh] overflow-y-auto`, responsive padding (`p-4 sm:p-6 md:p-8`), and responsive form grids (`grid-cols-1 sm:grid-cols-2`).
  - `report/page.tsx`: Fixed category radio grids, multiline textarea sizing, photo and location capture touch blocks (`min-h-[140px]`), and responsive submit button.
  - `map/page.tsx`: Added collapsible mobile telemetry legend, responsive header layout with location sharing control, and touch-accessible map markers.
  - `team/page.tsx`: Responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) and responsive user registration modal.
  - `calls/page.tsx`: Flexible mobile height with accessible contacts scroll area.
  - `CallProvider.tsx`: Added `p-4` boundary to global WebRTC call modal to prevent screen-edge clipping on 320px devices.
  - `landing/page.tsx`: Responsive pill navigation, bento grid auto-stacking on mobile, and fluid pricing card padding.
- **Verification:**
  - Web Build: `npm run build -w apps/web` passed with 0 TypeScript/Turbopack errors (11 static pages generated).
  - API Unit Tests: `npm run test -w apps/api` passed (23/23 tests in 4 suites).
  - API Linter: `npm run lint -w apps/api` passed (0 errors).
  - All 8 application routes verified returning `200 OK`.

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
