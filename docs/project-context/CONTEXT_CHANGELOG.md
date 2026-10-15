# Context Documentation Changelog

This document tracks updates and modifications to the persistent engineering knowledge base located in `docs/project-context/`.

---

## [v1.3.0] — 2026-10-15
### Interactive Issue Detail Modal, Full Status Stepper & Evidence Lightbox
- **Trigger:** User request to show full status and enable coordinators to view attached images upon clicking an issue.
- **Documents Updated:**
  - `FILE_OWNERSHIP_MAP.md`: Added `IssueDetailModal.tsx` under Shared Context & Client Providers.
  - `FEATURE_CATALOG.md`: Added `FEAT-08` detailing interactive ticket inspection, full status progress stepper, photo evidence lightbox, and field proof upload.
  - `CURRENT_STATE.md`: Logged new capability and updated passing test and build metrics.
  - `CHANGELOG.md`: Added engineering changelog entry for `IssueDetailModal` and backend attachment synchronization.
  - `CONTEXT_CHANGELOG.md`: Logged documentation sync for v1.3.0.

## [v1.2.0] — 2026-10-15
### Complete Website Responsive Optimization & Production Hardening
- **Trigger:** Full-suite responsive audit and optimization across 320px–2560px viewports for all pages, layouts, navigation, forms, modals, tables, and telemetry components.
- **Documents Updated:**
  - `CURRENT_STATE.md`: Documented responsive audit status, verified Next.js 16 build passing (0 TS errors), 23/23 API unit tests passing, and mobile-first architectural updates.
  - `CHANGELOG.md`: Detailed breakdown of responsive layout fixes across `Sidebar.tsx`, `globals.css`, `layout.tsx`, `page.tsx`, `issues/page.tsx`, `tasks/page.tsx`, `report/page.tsx`, `map/page.tsx`, `team/page.tsx`, `calls/page.tsx`, `landing/page.tsx`, and provider overlays.
  - `CONTEXT_CHANGELOG.md`: Logged documentation sync for v1.2.0.

## [v1.1.0] — 2026-10-15
### Role Permissions, Concurrency Cursor, and Location Controls
- **Trigger:** Implementation of 6-tier designation hierarchy, round-robin cursor, task assignment matrix, and coordinator location sharing controls.
- **Documents Updated:**
  - `CURRENT_STATE.md`: Updated operational test counts (23 unit tests), Web build verification status, and implemented capability checklist.
  - `CHANGELOG.md`: Documented full backend and frontend changes for role hierarchy, round-robin, and location sharing.
  - `CONTEXT_CHANGELOG.md`: Logged documentation sync for v1.1.0.

## [v1.0.0] — 2026-10-12

### Initialized Engineering Knowledge System
- **Trigger:** Master Instruction to establish persistent project context and self-updating documentation.
- **Documents Created:**
  - `AGENTS.md`: Persistent agent operating guidelines, documentation reading order, and rules against repetitive full-repo scanning.
  - `docs/project-context/PROJECT_INDEX.md`: Master navigation index and entry point.
  - `docs/project-context/PROJECT_OVERVIEW.md`: High-level problem statement, user personas, roles, and boundaries.
  - `docs/project-context/ARCHITECTURE.md`: Monorepo architecture, module map, WebSocket room routing, WebRTC signaling, and Mermaid diagrams.
  - `docs/project-context/REPOSITORY_MAP.md`: Workspace structure, file boundaries, and directory layout.
  - `docs/project-context/FEATURE_CATALOG.md`: Complete feature-by-feature specification cross-linking code, endpoints, and data models.
  - `docs/project-context/DATABASE_SCHEMA.md`: Prisma schema models, fields, enums, relations, constraints, and ER diagram.
  - `docs/project-context/API_REFERENCE.md`: REST endpoints and bidirectional WebSocket event contracts.
  - `docs/project-context/BUSINESS_RULES.md`: Core invariants (round-robin dispatch, supervisor verification gate, IDOR rules, 2-hr SLA escalation).
  - `docs/project-context/WORKFLOWS.md`: End-to-end lifecycle workflows (incident report to verification, escalation, live tracking, WebRTC calls).
  - `docs/project-context/TESTING_AND_OPERATIONS.md`: Verified commands, test executions, operations guide, environment variable catalog (zero secrets).
  - `docs/project-context/DEPENDENCIES_AND_INTEGRATIONS.md`: Inventory of verified packages, runtimes, and external integrations.
  - `docs/project-context/KNOWN_ISSUES.md`: Verified technical debt and architectural constraints.
  - `docs/project-context/DECISIONS.md`: Architecture Decision Records (ADR-001 through ADR-006).
  - `docs/project-context/CHANGELOG.md`: Engineering changelog tracing project phases and Git commit evolution.
  - `docs/project-context/CURRENT_STATE.md`: Operational snapshot of current verified build status.
  - `docs/project-context/FILE_OWNERSHIP_MAP.md`: Precise mapping of responsibilities to files for fast selective retrieval.
  - `docs/project-context/CONTEXT_CHANGELOG.md`: This maintenance log.
- **Corrected Assumptions:**
  - Verified that local passwords in PostgreSQL are deprecated in favor of authoritative Supabase GoTrue Auth.
  - Verified that MapLibre GL worker is served locally from `/public/maplibre-worker.mjs` to eliminate edge CDN CORS errors.
  - Identified that legacy `apps/api/prisma/seed.ts` has schema drift (singular `role`), whereas `quick-seed.js` and `custom-seed.js` use the current array schema (`roles: Role[]`).
- **Remaining Gaps:**
  - Long-term S3 cloud storage provider for attachments (interface exists, cloud driver pending).
