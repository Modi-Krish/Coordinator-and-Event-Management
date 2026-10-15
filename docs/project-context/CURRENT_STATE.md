# Current Repository State

**Verification Date:** October 15, 2026  
**Git Branch:** `main`  
**Latest Verification:** 23 passing tests (Vitest), 0 lint errors (Oxlint), Next.js production build passing.

---

## 1. Operational Status

- **Development Server:** Fully operational (`npm run dev` running full stack: NestJS API on port 3001, Next.js Web on port 3000).
- **Unit Test Status:** Verified passing (`npm run test -w apps/api` passed 23/23 tests in 4 test suites: `authorization.service.spec.ts`, `users.service.spec.ts`, `issues.service.spec.ts`, `app.controller.spec.ts`).
- **Linter Status:** Verified passing with 0 errors via Oxlint (`npm run lint -w apps/api`).
- **Web Build Status:** Verified passing with 0 TypeScript errors (`npm run build -w apps/web`).
- **Database Status:** PostgreSQL connected with active Prisma schema including `RoundRobinCursor`, `locationSharingEnabled`, and `lastLocationAt`.

---

## 2. Implemented Capabilities Snapshot

| Capability | Status | Notes |
| :--- | :--- | :--- |
| **Comprehensive Mobile-First Responsiveness** | Working | Complete multi-viewport optimization across 320px–2560px viewports (small mobile, standard mobile, tablet, laptop, desktop, ultra-wide). |
| **Responsive Mobile Navigation Shell** | Working | Sticky mobile header with real-time connection badge, notification trigger, user chip, and touch-optimized sliding drawer (< 768px). |
| **Dual View Issue & Task Dashboards** | Working | Auto-switching presentation: responsive tables on desktop (>= 768px) and touch-friendly card layouts with >= 44px action buttons on mobile (< 768px). |
| **Responsive Modals & Overlays** | Working | Constrained viewport heights (`max-h-[90dvh] overflow-y-auto`) and fluid responsive padding on task creation, task assignment, registration, and WebRTC calls. |
| **Adaptive Telemetry & Maps** | Working | Map telemetry preview and live map canvas dynamically adapt to small screens with collapsible legends and touch-accessible markers. |
| **6-Role Designation Model** | Working | Complete designation hierarchy (`STUDENT < COORDINATOR < INTERN ≈ CORE < FACULTY < MANAGER`) supported in backend & frontend. |
| **Centralized Authorization Service** | Working | `AuthorizationService` enforces matrix rules for `canAssignTask`, `canAssignIssue`, `canViewIssue`, `canViewUserLocation`, `canVerifyIssue`. |
| **Task Assignment Restrictions** | Working | Coordinators and Students blocked from assigning tasks (403 Forbidden). Scope-aware task assignment for Interns, Core, Faculty, Managers. |
| **Atomic Concurrency-Safe Round-Robin** | Working | `RoundRobinCursor` table in DB with transaction locks cycles student issues across active coordinators (1 → 2 → 3 → 1 → 2 → 3). |
| **Direct Issue Assignment Precedence** | Working | Direct assignment by higher authorities takes precedence over round-robin and preserves cursor state. |
| **Explicit Location Sharing Controls** | Working | `LocationSharingControl` component lets Coordinators toggle sharing. State persisted in DB; realtime broadcasts blocked when disabled. |
| **Telemetry Staleness Detection** | Working | `GET /users/team-locations` classifies locations as `LIVE` (<= 5 min), `STALE` (> 5 min), `SHARING_DISABLED`, or `UNAVAILABLE`. |
| **Role-Aware Dashboards & UI** | Working | "Assign Task" buttons hidden from Coordinators. Dynamic status transitions and assignee selection scoped to user hierarchy. |
| **Supervisory Verification Gate** | Working | Enforces 403 Forbidden for non-supervisors attempting to verify tickets. |
| **Live Map & Realtime Telemetry** | Working | Map telemetry with live/stale/disabled badges and WebRTC voice link initiation. |

---

## 3. Active Blockers & Known Issues

1. **Legacy `migrate.js`:** Contains hardcoded Supabase service role credentials that should be cleaned up.
2. **Legacy `apps/api/prisma/seed.ts`:** Uses singular `role` field from an earlier schema version; developers should use `quick-seed.js` or `custom-seed.js`.
3. **TURN Server Configuration:** WebRTC video calls currently rely solely on STUN, which may fail on symmetric NAT enterprise firewalls.

---

## 4. Next Recommended Actions

- Implement an S3/Cloudflare R2 adapter under `IStorageService` for scalable multi-instance attachment storage.
- Add an HTTP Interceptor for automatic population of the `AuditLog` table.
- Clean up or delete legacy script `apps/api/migrate.js`.
