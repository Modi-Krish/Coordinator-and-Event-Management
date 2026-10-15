# Project Overview

## 1. Problem Statement

Campus and municipal organizations struggle with fragmented incident handling. Field issues (such as structural damage, plumbing failures, electrical outages, or logistical hazards) are typically reported through disconnected channels without location precision, automated dispatching, or accountability. Consequently:
- Field workers cannot easily locate incidents without geographic coordinates.
- Reporting citizens/students lack visibility into resolution progress.
- Management lacks real-time insight into team member locations and workload.
- Stalled or neglected issues do not escalate hierarchically.
- Field coordination lacks instant, encrypted voice/video communication.

The **Real-Time Coordinator and Issue Management System** solves these challenges by combining **live GIS mapping**, **automated round-robin coordinator assignment**, **WebSocket status broadcasting**, **WebRTC voice/video calling**, and an **automated cron escalation engine**.

---

## 2. Intended Users & User Personas

| Role (`Role` enum) | Verified Designations | Intended Responsibilities |
| :--- | :--- | :--- |
| **`CITIZEN`** | `STUDENT` | Reports issues with geolocation & photos; monitors progress on reported tickets. |
| **`STAFF`** | `COORDINATOR`, `INTERN` | Field responders; automatically assigned issues via round-robin; accepts, progresses, and resolves tasks; streams live GPS. |
| **`SUPERVISOR`** | `FACULTY`, `MANAGER` | Department heads; views all team members and issues; verifies resolved issues; receives escalated alerts for overdue tasks. |
| **`ADMIN`** | `CORE`, `MANAGER` | System operators; full visibility across all locations, users, and audit logs; manages hierarchy and user role allocations. |

---

## 3. Major Implemented Features

### 3.1 Live Geospatial Incident & Staff Tracking
- Interactive MapLibre GL map visualizes issue pins and active staff GPS markers.
- Coordinates are emitted over WebSockets and rendered in real-time.
- Local MapLibre web worker prevents CORS errors when running locally or on edge CDNs.

### 3.2 Automated Round-Robin Coordinator Dispatch
- Citizen-submitted issues (type `ISSUE`) without an explicit assignee automatically find active `STAFF` members designated as `COORDINATOR`.
- The system determines the last assigned coordinator and dispatches to the next in sequence.

### 3.3 Strict Hierarchical Role-Based Security
- **Verification Gate:** Only users with `SUPERVISOR` or `ADMIN` roles can transition an issue from `RESOLVED` to `VERIFIED`.
- **IDOR Protection:** Citizens cannot modify tickets reported by or assigned to others.
- **Hierarchical Reporting:** Managers oversee subordinates through explicit `UserRelationship` links (`DIRECT_REPORT`).

### 3.4 SLA Escalation Engine
- A periodic cron job runs every 30 minutes.
- Unresolved issues remaining open for over 2 hours are transitioned to `ESCALATED`.
- WebSocket notifications and database records are instantly pushed to the assignee's direct manager.

### 3.5 WebRTC Voice & Video Communications
- Peer-to-peer browser-based calling powered by Google STUN servers.
- Socket.io acts as the signaling channel for SDP offers, answers, and ICE candidate exchanges.

### 3.6 Media Attachment Pipeline
- Photos and attachments submitted with issue reports are stored locally via `LocalStorageService` into `/uploads` and served statically.

---

## 4. Application Boundaries & System Scope

- **In Scope:**
  - Citizen and field staff incident reporting with geolocation.
  - Round-robin task dispatching among coordinators.
  - Real-time location streaming and WebSocket notification push.
  - Video/audio signaling and call state tracking.
  - Hierarchical user management and team assignments.
  - Automated ticket escalation after 2 hours of inactivity.
- **Out of Scope (Current Implementation):**
  - External SMS or third-party email gateways (all notifications are in-app WebSockets).
  - AWS S3 or Cloudflare R2 file storage (uploads use the local filesystem).
  - External TURN relay servers (calls rely on STUN; symmetrical NAT traversal may fail in restricted enterprise networks).

---

## 5. Technology Stack Summary

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, MapLibre GL v6, Lucide React, Framer Motion.
- **Backend:** NestJS 12, Node.js runtime, Express platform adapter, Socket.io, Multer, Passport-JWT.
- **Persistence:** PostgreSQL, Prisma ORM v5, Supabase Auth.
- **Hosting / Deploy:** Render Web Service blueprint (`render.yaml`) for API; Vercel/Node for Web.

---

## 6. Implementation Status Matrix

| Feature Module | Implementation Status | Evidence / Verification |
| :--- | :--- | :--- |
| **Authentication (Supabase + JWT)** | Fully Implemented | `apps/api/src/auth/auth.service.ts` |
| **Issue Creation & Auto Round-Robin** | Fully Implemented | `apps/api/src/issues/issues.service.ts:reportIssue` |
| **Issue Verification Access Gate** | Fully Implemented | `apps/api/src/issues/issues.service.ts:updateIssueStatus` |
| **Live Map & Staff Tracking** | Fully Implemented | `apps/web/src/app/map/page.tsx` & `realtime.gateway.ts` |
| **WebRTC Audio/Video Comms** | Fully Implemented | `apps/web/src/components/CallProvider.tsx` |
| **30-Min SLA Escalation Cron** | Fully Implemented | `apps/api/src/escalation/escalation.service.ts` |
| **Audit Logging Schema** | Schema Implemented | `apps/api/prisma/schema.prisma:AuditLog` |
| **S3 Cloud Storage** | Architecture Interface Defined | `apps/api/src/storage/storage.interface.ts` (uses LocalStorage) |
| **Automated End-to-End Test Suite** | Partially Implemented | Vitest unit test passes; e2e file exists in `apps/api/test/` |
