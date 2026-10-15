# AGENTS.md — Persistent Agent Operating Guidelines

This repository enforces a **context-first, self-updating engineering documentation system**.
All coding agents operating on this codebase must adhere strictly to the protocols defined below.

---

## 1. Operating Principle

> **Analyze deeply once. Document comprehensively. Retrieve selectively. Change incrementally. Update documentation with every change.**

Do not recursively inspect or re-scan the entire repository for routine tasks. Use the persistent knowledge base in [`docs/project-context/`](docs/project-context/PROJECT_INDEX.md) to locate exact files, architecture constraints, and business rules.

---

## 2. Documentation Reading Order

Before making changes, always load context in this sequence:
1. **[`AGENTS.md`](AGENTS.md)** (this file) — Operating constraints and rules.
2. **[`docs/project-context/PROJECT_INDEX.md`](docs/project-context/PROJECT_INDEX.md)** — Project navigation index and quick routing.
3. **[`docs/project-context/FILE_OWNERSHIP_MAP.md`](docs/project-context/FILE_OWNERSHIP_MAP.md)** — Map of features to exact files.
4. **Task-Specific Documentation** — Retrieve only what is relevant:
   - For UI / Pages: [`FEATURE_CATALOG.md`](docs/project-context/FEATURE_CATALOG.md) & [`REPOSITORY_MAP.md`](docs/project-context/REPOSITORY_MAP.md)
   - For APIs & Sockets: [`API_REFERENCE.md`](docs/project-context/API_REFERENCE.md) & [`ARCHITECTURE.md`](docs/project-context/ARCHITECTURE.md)
   - For Database & Models: [`DATABASE_SCHEMA.md`](docs/project-context/DATABASE_SCHEMA.md)
   - For Logic & Permissions: [`BUSINESS_RULES.md`](docs/project-context/BUSINESS_RULES.md) & [`WORKFLOWS.md`](docs/project-context/WORKFLOWS.md)
   - For Environment & Testing: [`TESTING_AND_OPERATIONS.md`](docs/project-context/TESTING_AND_OPERATIONS.md)

---

## 3. Mandatory Context-First Workflow

For every user task:
1. **Identify Scope:** Use [`FILE_OWNERSHIP_MAP.md`](docs/project-context/FILE_OWNERSHIP_MAP.md) and [`PROJECT_INDEX.md`](docs/project-context/PROJECT_INDEX.md) to find affected files.
2. **Verify Against Active Code:** Check the target files, imports, and active tests.
3. **Implement Minimal Complete Change:** Follow established code patterns; preserve invariants (e.g., RBAC, verification gates, round-robin assignments).
4. **Run Verification Commands:**
   - Unit tests: `npm run test -w apps/api`
   - Lint check: `npm run lint -w apps/api`
5. **Update Persistent Documentation:** Updating affected documents in `docs/project-context/` is a **mandatory acceptance criteria** of the task. Update [`CURRENT_STATE.md`](docs/project-context/CURRENT_STATE.md), [`CHANGELOG.md`](docs/project-context/CHANGELOG.md), and [`CONTEXT_CHANGELOG.md`](docs/project-context/CONTEXT_CHANGELOG.md).

---

## 4. Architectural Boundaries & Invariants

- **Monorepo:** Root workspaces: `apps/api` (NestJS 12 backend) and `apps/web` (Next.js 16 App Router frontend).
- **Authentication:** Supabase Auth for identity management, validated via Passport JWT Strategy. Passwords are never hashed or checked locally in `/auth/login`; Supabase is authoritative.
- **Role Verification:** Only `SUPERVISOR` or `ADMIN` roles can transition an issue to `VERIFIED` status.
- **Round-Robin Assignment:** Citizen-reported issues with type `ISSUE` are automatically round-robin assigned among `STAFF` users holding the `COORDINATOR` designation.
- **Real-Time Gateway:** Socket.io handles event broadcasts (`issue:new`, `issue:updated`, `issue:deleted`), location tracking (`location:update`), and WebRTC signaling (`call:signal`).
- **Escalation Engine:** NestJS cron job runs every 30 minutes, escalating unresolved issues older than 2 hours to the assignee's direct manager.

---

## 5. Security & Safety Rules

1. **Zero Secret Exposure:** Never log, write, or document real API keys, Supabase service keys, JWT secrets, or DB passwords. Document environment variable names only.
2. **No Blind Rewrites:** Do not execute large-scale refactoring during feature changes or documentation tasks.
3. **Preserve Database Safety:** Never run destructive migrations or drop tables unless explicitly instructed.
4. **No Unrequested Pushes:** Do not push to remote Git repositories or deploy unless explicitly directed.

---

## 6. Key Commands

```bash
# Start full stack development concurrently
npm run dev

# Run API unit tests
npm run test -w apps/api

# Run API linter (Oxlint)
npm run lint -w apps/api

# Build both applications
npm run build
```
