# Feature Catalog

This document indexes all major features implemented in the repository, linking user interface entry points, backend API endpoints, and database models.

---

## 1. Feature: Incident Reporting (`FEAT-01`)

- **Purpose:** Allows citizens and students to report localized issues (e.g. broken infrastructure, hazards) with mandatory GPS location and optional photo attachments.
- **Allowed Roles:** `CITIZEN`, `STAFF`, `SUPERVISOR`, `ADMIN`.
- **Frontend Entry Point:** `/report` ([`apps/web/src/app/report/page.tsx`](../../apps/web/src/app/report/page.tsx)).
- **Backend Endpoints:**
  - `POST /issues` handled by [`IssuesController.reportIssue`](../../apps/api/src/issues/issues.controller.ts)
  - `POST /issues/:id/attachments` handled by [`IssuesController.uploadAttachment`](../../apps/api/src/issues/issues.controller.ts)
- **Database Entities:** `Issue` (title, description, locationLat, locationLng, category, type, status, reportedById, assignedToId), `IssueAttachment` (fileUrl, mimeType, fileSize).
- **Business Logic:**
  - If `assignedToId` is omitted and `type === 'ISSUE'`, the system performs automated **round-robin coordinator assignment** among active `STAFF` members with the `COORDINATOR` designation.
  - If assigned, initial status is `ASSIGNED`; otherwise, initial status is `REPORTED`.
- **Side Effects:**
  - Emits `issue:new` via Socket.io to all connected clients.
  - Creates an in-app `Notification` and emits `notification:new` to the assigned coordinator.
- **Validation Rules:** Title is required; location coordinates (`locationLat`, `locationLng`) are required.

---

## 2. Feature: Dual Incident & Task Dashboards (`FEAT-02`)

- **Purpose:** Segregates high-level civic incidents from staff operational work orders using type-based filtering (`type=ISSUE` vs `type=TASK`).
- **Allowed Roles:**
  - `CITIZEN`: Sees only their own reported items.
  - `STAFF`: Sees items assigned to them.
  - `SUPERVISOR`, `ADMIN`: Full visibility across all items.
- **Frontend Entry Points:**
  - `/` (Main Overview): Shows unified metrics, active ticket feeds, and live MapLibre map.
  - `/issues`: Filtered view showing `GET /issues?type=ISSUE`.
  - `/tasks`: Filtered view showing `GET /issues?type=TASK`.
- **Backend Endpoint:** `GET /issues?type={type}` handled by [`IssuesController.getIssues`](../../apps/api/src/issues/issues.controller.ts).
- **Database Entities:** `Issue`.
- **Real-Time Integration:** Listens on Socket.io events `issue:new`, `issue:updated`, and `issue:deleted` to update dashboard state reactively without page reloads.

---

## 3. Feature: Issue Lifecycle & Verification Gate (`FEAT-03`)

- **Purpose:** Governs the status lifecycle of an issue from intake to closure with permission checks on sensitive transitions.
- **Allowed Roles:**
  - General Transitions (`ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`): Assignee, Reporter, or Supervisor/Admin.
  - **Verification Transition (`VERIFIED`): Restricted exclusively to `SUPERVISOR` or `ADMIN`.
- **Frontend Entry Points:** Status buttons on `/issues` and `/tasks` cards.
- **Backend Endpoint:** `PATCH /issues/:id/status` handled by [`IssuesController.updateStatus`](../../apps/api/src/issues/issues.controller.ts).
- **Database Entities:** `Issue`, `IssueStatusHistory`.
- **State Progression:**
  ```
  REPORTED -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> RESOLVED -> VERIFIED -> CLOSED
                                                  \-> ESCALATED / REJECTED
  ```
- **Business Invariants:**
  - Attempting to set `status = VERIFIED` without `SUPERVISOR` or `ADMIN` role throws `403 Forbidden`.
  - Setting `ACCEPTED` records `acceptedAt = now()`.
  - Setting `RESOLVED` records `resolvedAt = now()`.
  - Setting `CLOSED` records `closedAt = now()`.
  - Emits `issue:updated` to all connected WebSocket clients.

---

## 4. Feature: Live GIS Map & Personnel Tracking (`FEAT-04`)

- **Purpose:** Displays live incident markers and real-time field staff GPS locations on an interactive vector map.
- **Allowed Roles:** All authenticated users (`CITIZEN`, `STAFF`, `SUPERVISOR`, `ADMIN`).
- **Frontend Entry Points:**
  - `/` (Mini dashboard map)
  - `/map` (Full-screen dedicated interactive map)
- **Map Engine:** MapLibre GL v6 with `react-map-gl`, utilizing a local web worker at `/maplibre-worker.mjs` to avoid cross-origin restrictions.
- **WebSocket Events:**
  - Client sends `location:update` `{ lat, lng, accuracy }`.
  - Handled by [`RealtimeGateway.handleLocationUpdate`](../../apps/api/src/realtime/realtime.gateway.ts).
  - Emits `location:update` to `managers_of:<userId>` and `all_locations`.
- **Database Entities:** `LocationHistory` (stores historical breadcrumbs).

---

## 5. Feature: Automated 30-Minute SLA Escalation Engine (`FEAT-05`)

- **Purpose:** Automatically escalates neglected or stalled incidents to managerial oversight.
- **Mechanism:** Background cron job running via NestJS `@Cron(CronExpression.EVERY_30_MINUTES)`.
- **Backend File:** [`EscalationService.handleIssueEscalations`](../../apps/api/src/escalation/escalation.service.ts).
- **Escalation Rules:**
  - Evaluates issues created > 2 hours ago.
  - Excludes issues in `RESOLVED`, `CLOSED`, `ESCALATED`, or `REJECTED` status.
  - If the assigned staff member has an established reporting manager in `UserRelationship`, the issue status is updated to `ESCALATED`.
  - A notification (`type = 'ESCALATION'`) is pushed to the manager's inbox and broadcast via WebSocket.
  - An `issue:updated` event is broadcast globally.

---

## 6. Feature: WebRTC Voice & Video Communications (`FEAT-06`)

- **Purpose:** Encrypted peer-to-peer audio and video calls between coordinators, field workers, and managers.
- **Frontend Entry Points:**
  - `/calls` ([`apps/web/src/app/calls/page.tsx`](../../apps/web/src/app/calls/page.tsx))
  - Call action buttons in the `/team` directory.
- **Components:** [`CallProvider.tsx`](../../apps/web/src/components/CallProvider.tsx).
- **Backend Endpoints & Handlers:**
  - `POST /calls/initiate`: Creates a call record and notifies target over WS.
  - `PATCH /calls/:id/status`: Updates call status (`ACCEPTED`, `REJECTED`, `ENDED`, `MISSED`).
  - `GET /calls`: Retrieves call history.
  - WebSocket Events: `call:signal` (SDP/ICE candidate relay), `call:accept`, `call:reject`.
- **Database Entities:** `Call` (initiatedById, recipientId, callType, status, startedAt, endedAt, durationSeconds).

---

## 7. Feature: Team Hierarchy & Subordinate Management (`FEAT-07`)

- **Purpose:** Supports organizational structuring, viewing direct reports, and allocating staff members under specific faculty/supervisors.
- **Frontend Entry Point:** `/team` ([`apps/web/src/app/team/page.tsx`](../../apps/web/src/app/team/page.tsx)).
- **Backend Endpoints:**
  - `GET /users/team`: Returns accessible team members.
  - `GET /users/hierarchy`: Returns hierarchical tree.
  - `POST /users`: Creates a new user and creates a `DIRECT_REPORT` entry in `UserRelationship`.
- **Database Entities:** `User`, `Department`, `UserRelationship`.
- **Permission Rules:**
  - `ADMIN` and `SUPERVISOR` see all team members.
  - `STAFF` see only their direct subordinates.
  - `ADMIN` can specify `reportingManagerId` when provisioning users to attach subordinates to other managers.
