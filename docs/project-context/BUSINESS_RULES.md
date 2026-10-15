# Business Rules & Invariants

This document specifies the non-negotiable business rules, validation constraints, and operational invariants enforced by the system.

---

## 1. Authentication & Role Invariants (`BR-AUTH`)

### BR-AUTH-01: Public Self-Registration Privilege Limitation
- **Rule:** When users self-register via `POST /auth/register`, they are unconditionally assigned the `CITIZEN` role and `STUDENT` designation.
- **Invariant:** Clients cannot inject elevated roles (`ADMIN`, `SUPERVISOR`, `STAFF`) via registration payloads.
- **Enforcement:** [`AuthService.register`](../../apps/api/src/auth/auth.service.ts) hardcodes `roles: [Role.CITIZEN]` and `designations: ['STUDENT']`.

### BR-AUTH-02: Authoritative Identity Storage
- **Rule:** Supabase Auth is the authoritative identity provider. Local password hashes in PostgreSQL are never used for authentication verification in `/auth/login`.
- **Enforcement:** [`AuthService.login`](../../apps/api/src/auth/auth.service.ts) delegates password checking directly to `supabase.auth.signInWithPassword`.

---

## 2. Issue Lifecycle & Verification Invariants (`BR-ISSUE`)

### BR-ISSUE-01: Automated Round-Robin Coordinator Assignment
- **Rule:** If an issue is reported with `type === 'ISSUE'` and no `assignedToId` is provided:
  1. The system queries all active users with `Role.STAFF` and designation `'COORDINATOR'`.
  2. If coordinators exist, the system inspects the last created issue assigned to any coordinator.
  3. The next coordinator in round-robin sequence is selected and assigned.
  4. The issue status is initialized to `ASSIGNED`.
- **Fallback:** If no coordinators exist in the system, the issue status defaults to `REPORTED` with `assignedToId: null`.
- **Enforcement:** [`IssuesService.reportIssue`](../../apps/api/src/issues/issues.service.ts:L24-L54).

### BR-ISSUE-02: Supervisor Verification Gate
- **Rule:** Only users with `SUPERVISOR` or `ADMIN` roles can transition an issue to `status = VERIFIED`.
- **Invariant:** Field staff, coordinators, and citizens attempting to mark an issue as `VERIFIED` must be rejected with `403 Forbidden`.
- **Enforcement:** [`IssuesService.updateIssueStatus`](../../apps/api/src/issues/issues.service.ts:L129-L131).

### BR-ISSUE-03: IDOR Modification Prevention
- **Rule:** An issue can only be updated by:
  1. The reporting user (`reportedById === user.userId`)
  2. The assigned staff member (`assignedToId === user.userId`)
  3. A user with `SUPERVISOR` or `ADMIN` role.
- **Invariant:** Unauthorized users modifying an issue receive `403 Forbidden`.
- **Enforcement:** [`IssuesService.updateIssueStatus`](../../apps/api/src/issues/issues.service.ts:L117-L123).

### BR-ISSUE-04: Role Restriction Boundaries (`restrictToRole`)
- **Rule:** If an issue has `restrictToRole` populated (e.g., restricted to `SUPERVISOR`), users without that role (unless they are `ADMIN`) are forbidden from updating the issue.
- **Enforcement:** [`IssuesService.updateIssueStatus`](../../apps/api/src/issues/issues.service.ts:L125-L127).

### BR-ISSUE-05: Lifecycle Timestamp Auditing
- **Rule:** Whenever an issue transitions into milestone statuses, the corresponding timestamps must be recorded:
  - Transition to `ACCEPTED` -> sets `acceptedAt = now()`
  - Transition to `RESOLVED` -> sets `resolvedAt = now()`
  - Transition to `CLOSED` -> sets `closedAt = now()`
- **Enforcement:** [`IssuesService.updateIssueStatus`](../../apps/api/src/issues/issues.service.ts:L137-L139).

---

## 3. SLA Escalation Invariants (`BR-ESCALATE`)

### BR-ESCALATE-01: Two-Hour SLA Threshold
- **Rule:** Any issue not resolved, closed, already escalated, or rejected within 2 hours of creation is automatically escalated.
- **Condition:** `status NOT IN ['RESOLVED', 'CLOSED', 'ESCALATED', 'REJECTED'] AND createdAt < now() - 2 hours`.
- **Enforcement:** Scheduled cron in [`EscalationService.handleIssueEscalations`](../../apps/api/src/escalation/escalation.service.ts:L19-L30).

### BR-ESCALATE-02: Hierarchical Manager Notification
- **Rule:** Escalated issues must notify the direct manager of the assigned staff member via the `UserRelationship` table.
- **Enforcement:** [`EscalationService.handleIssueEscalations`](../../apps/api/src/escalation/escalation.service.ts:L43-L64).

---

## 4. Communication & Geolocation Invariants (`BR-COMMS`)

### BR-COMMS-01: Location Tracking Permission Boundary
- **Rule:** Live GPS updates emitted via `location:update` are routed only to direct managers (`managers_of:<userId>`) and administrators (`all_locations`). Field personnel do not see peer locations without authorization.
- **Enforcement:** [`RealtimeGateway.handleLocationUpdate`](../../apps/api/src/realtime/realtime.gateway.ts:L95-L96).

### BR-COMMS-02: WebRTC Room Isolation
- **Rule:** Call signaling messages (`call:signal`, `call:accept`, `call:reject`) are delivered strictly to the private room of the target user (`user:<targetUserId>`).
- **Enforcement:** [`RealtimeGateway`](../../apps/api/src/realtime/realtime.gateway.ts:L121).
