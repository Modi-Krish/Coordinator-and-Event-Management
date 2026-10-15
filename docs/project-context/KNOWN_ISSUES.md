# Known Issues & Technical Debt

This document tracks confirmed bugs, architectural limitations, and technical debt with supporting evidence.

---

## 1. Confirmed Issues & Technical Debt

### `ISSUE-01`: Hardcoded Supabase Key in Legacy `migrate.js`
- **Severity:** High (Security Risk).
- **Status:** Open / Technical Debt.
- **Evidence:** File [`apps/api/migrate.js`](../../apps/api/migrate.js:L8) contains hardcoded credentials from a past migration script.
- **Mitigation / Remedy:** The file is not run in standard CI/CD or production flows. It should be refactored to read from `process.env.SUPABASE_SERVICE_ROLE_KEY` or permanently deleted.

### `ISSUE-02`: Schema Incompatibility in Legacy `apps/api/prisma/seed.ts`
- **Severity:** Medium.
- **Status:** Known Incompatibility.
- **Evidence:** [`seed.ts`](../../apps/api/prisma/seed.ts:L36) assigns `role: Role.ADMIN` (singular), whereas `schema.prisma` now defines `roles: Role[]` (array). Running `seed.ts` directly fails TypeScript compilation.
- **Workaround:** Developers must use `quick-seed.js` or `custom-seed.js`, which correctly utilize the array schema.

### `ISSUE-03`: Unused Catch Parameter in `realtime.gateway.ts`
- **Severity:** Low.
- **Status:** Confirmed Warning.
- **Evidence:** Flagged by Oxlint (`eslint(no-unused-vars)`) in [`realtime.gateway.ts:L71`](../../apps/api/src/realtime/realtime.gateway.ts:L71) (`catch (_e)` parameter).
- **Remedy:** Replace with parameterless `catch` or log the debug error.

### `ISSUE-04`: Lack of Turn Relay for WebRTC Media Streams
- **Severity:** Medium.
- **Status:** Architectural Constraint.
- **Evidence:** [`CallProvider.tsx`](../../apps/web/src/components/CallProvider.tsx:L46-L49) configures only public STUN servers (`stun:stun.l.google.com:19302`).
- **Impact:** Users behind restrictive symmetric firewalls or mobile NATs may experience peer connection negotiation failures.
- **Remedy:** Configure a managed TURN server (e.g. Twilio Network Traversal or coturn).

### `ISSUE-05`: Local Disk Storage Not Suitable for Distributed Scaling
- **Severity:** Medium.
- **Status:** Architectural Constraint.
- **Evidence:** [`LocalStorageService.ts`](../../apps/api/src/storage/local-storage.service.ts) saves attachments to local disk directory `uploads/`.
- **Impact:** In multi-instance or ephemeral container deployments (e.g. Render auto-scale instances without persistent disks), uploaded files will not be shared across replicas.
- **Remedy:** Implement an S3-compatible adapter using the existing `IStorageService` interface.

---

## 2. Incomplete or Planned Features

| Feature ID | Description | Current State |
| :--- | :--- | :--- |
| `PLAN-01` | S3 / Cloudflare R2 Storage Adapter | `IStorageService` interface is implemented, but cloud driver is pending. |
| `PLAN-02` | Audit Log Service Interceptor | `AuditLog` table exists in Prisma schema, but automatic NestJS interceptor for HTTP logging is pending. |
| `PLAN-03` | Push Notifications (Web Push / FCM) | Real-time notifications are currently limited to active WebSocket connections. |
