# Repository Map & Directory Structure

## 1. Monorepo Root Layout

```
realtime-coordinator-system/
├── .env                              # Root environment variables (Database URLs, JWT secrets)
├── .gitignore                         # Root git ignore specification
├── AGENTS.md                          # Persistent operating guidelines for AI coding agents
├── package.json                       # Root workspace definition (npm workspaces)
├── package-lock.json                  # Root npm lockfile
├── render.yaml                        # Render Cloud deployment blueprint (Free tier node web service)
├── apps/
│   ├── api/                           # NestJS 12 Backend Application
│   └── web/                           # Next.js 16 App Router Frontend Application
└── docs/
    └── project-context/               # Persistent Engineering Knowledge System
```

---

## 2. Backend Workspace: `apps/api/`

```
apps/api/
├── .env                               # Local API environment overrides
├── .oxlintrc.json                     # Oxlint linter rules configuration
├── .prettierrc                        # Prettier code formatting rules
├── nest-cli.json                      # NestJS CLI build tool configuration
├── package.json                       # API package dependencies and run scripts
├── tsconfig.json                      # TypeScript compiler configuration
├── tsconfig.build.json                # Production build tsconfig
├── vitest.config.ts                   # Vitest unit test configuration
├── vitest.config.e2e.ts               # Vitest end-to-end test configuration
├── migrate.js                         # Legacy migration script (Supabase auth synchronization)
├── uploads/                           # Local filesystem directory for media attachments (gitignored)
│
├── prisma/
│   ├── schema.prisma                  # Complete PostgreSQL Prisma schema definition
│   ├── seed.ts                        # Development database seeding script
│   ├── quick-seed.js                  # Quick user upsert seed script
│   └── custom-seed.js                 # Supabase Admin user sync and seed script
│
├── test/
│   ├── app.e2e-spec.ts                # E2E NestJS starter test
│   └── security-workflow.e2e-spec.ts  # Role injection, IDOR, and verification workflow test
│
└── src/
    ├── main.ts                        # API runtime entrypoint (Express setup, static uploads, port)
    ├── app.module.ts                  # Root dependency injection container
    ├── app.controller.ts              # Root healthcheck controller
    ├── app.service.ts                 # Root service
    ├── app.controller.spec.ts         # Controller unit test (Vitest)
    │
    ├── auth/                          # Authentication & Security Module
    │   ├── auth.module.ts             # Auth dependency injection
    │   ├── auth.controller.ts         # POST /auth/register, POST /auth/login
    │   ├── auth.service.ts            # Supabase GoTrue Auth client logic
    │   ├── jwt.strategy.ts            # Passport JWT validation strategy
    │   ├── decorators/
    │   │   └── roles.decorator.ts     # @Roles(...) metadata decorator
    │   └── guards/
    │       ├── jwt-auth.guard.ts      # Bearer token verification guard
    │       └── roles.guard.ts         # RBAC role verification guard
    │
    ├── issues/                        # Core Incident & Task Management
    │   ├── issues.module.ts           # Issues module definition
    │   ├── issues.controller.ts       # REST endpoints for issues & attachments
    │   └── issues.service.ts          # Round-robin dispatch, status transitions, uploads
    │
    ├── users/                         # User Hierarchy & Team Module
    │   ├── users.module.ts            # Users module definition
    │   ├── users.controller.ts        # GET /users/team, GET /users/hierarchy, POST /users
    │   └── users.service.ts           # Hierarchy traversal & user creation logic
    │
    ├── calls/                         # WebRTC Call State Tracking
    │   ├── calls.module.ts            # Calls module definition
    │   ├── calls.controller.ts        # POST /calls/initiate, PATCH /calls/:id/status
    │   └── calls.service.ts           # Call record creation & WS signaling trigger
    │
    ├── notifications/                 # In-App Notifications
    │   ├── notifications.module.ts    # Notifications module definition
    │   ├── notifications.controller.ts# GET /notifications, PATCH /notifications/:id/read
    │   └── notifications.service.ts   # Notification creation & real-time WS push
    │
    ├── escalation/                    # Background Escalation Engine
    │   ├── escalation.module.ts       # Escalation module definition
    │   └── escalation.service.ts      # 30-min cron job for 2-hour unresolved tickets
    │
    ├── realtime/                      # WebSocket & WebRTC Gateway
    │   ├── realtime.module.ts         # Realtime module definition
    │   ├── realtime.gateway.ts        # Socket.io gateway, room routing, signaling
    │   └── ws-auth.guard.ts           # WebSocket connection authentication guard
    │
    ├── storage/                       # File Storage Abstraction
    │   ├── storage.module.ts          # Storage module definition
    │   ├── storage.interface.ts       # IStorageService contract & token
    │   └── local-storage.service.ts   # Local filesystem storage implementation
    │
    └── prisma/                        # Database Service Provider
        ├── prisma.module.ts           # Prisma module definition
        └── prisma.service.ts          # Global PrismaClient lifecycle provider
```

---

## 3. Frontend Workspace: `apps/web/`

```
apps/web/
├── .env.local                         # Local frontend environment variables (API URL, Supabase)
├── eslint.config.mjs                  # ESLint flat config
├── next.config.ts                     # Next.js 16 compiler options
├── package.json                       # Frontend dependencies and scripts
├── postcss.config.mjs                 # PostCSS Tailwind CSS v4 processor
├── tsconfig.json                      # TypeScript configuration
├── public/                            # Static assets
│   └── maplibre-worker.mjs            # Local MapLibre web worker (bypasses CORS restrictions)
│
└── src/
    ├── app/                           # Next.js App Router Structure
    │   ├── layout.tsx                 # Root layout (Auth, Socket, Call providers, Sidebar)
    │   ├── loading.tsx                # Global loading fallback indicator
    │   ├── globals.css                # Global stylesheet, custom glassmorphism & crypto theme
    │   ├── page.tsx                   # Main Dashboard: Incident metrics & interactive map
    │   ├── issues/
    │   │   └── page.tsx               # Dedicated Issues Management dashboard (type=ISSUE)
    │   ├── tasks/
    │   │   └── page.tsx               # Dedicated Tasks Management dashboard (type=TASK)
    │   ├── report/
    │   │   └── page.tsx               # Citizen incident reporting form with Geolocation & photo
    │   ├── team/
    │   │   └── page.tsx               # Team member directory, direct reports, add user modal
    │   ├── calls/
    │   │   └── page.tsx               # WebRTC dialer, active audio/video call panel
    │   ├── map/
    │   │   └── page.tsx               # Fullscreen live GIS incident and personnel map
    │   └── landing/
    │       └── page.tsx               # High-fidelity glassmorphism marketing & showcase page
    │
    ├── components/                    # Reusable Client Components
    │   ├── AuthProvider.tsx           # Authentication state, login form, demo credentials
    │   ├── Sidebar.tsx                # Primary navigation sidebar & live notification drawer
    │   ├── SocketProvider.tsx         # Socket.io client connection and state wrapper
    │   └── CallProvider.tsx           # WebRTC peer connection manager, audio/video modal
    │
    └── lib/                           # Utility & API Libraries
        ├── api.ts                     # fetchAPI wrapper with Bearer token injection
        └── utils.ts                   # Styling utilities (clsx, tailwind-merge)
```

---

## 4. Generated and Ignored Directories

The following directories are generated at build time and must not be edited or indexed for logic:
- `node_modules/`: Package dependencies.
- `apps/api/dist/`: Compiled NestJS JavaScript output.
- `apps/web/.next/`: Compiled Next.js output and static caches.
- `apps/api/uploads/`: Uploaded user images and attachments.
