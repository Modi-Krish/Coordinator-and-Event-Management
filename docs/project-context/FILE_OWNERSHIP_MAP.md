# File Ownership & Responsibility Map

This document maps engineering responsibilities directly to the implementing source code files, enabling instant, single-file retrieval for future development tasks without full-repository scanning.

---

## 1. Backend Modules (`apps/api/`)

| Responsibility Area | Primary Implementation Files | Supporting Files / References |
| :--- | :--- | :--- |
| **HTTP Bootstrap & Setup** | [`src/main.ts`](../../apps/api/src/main.ts) | Express setup, static uploads prefix, port listener |
| **Dependency Injection Container** | [`src/app.module.ts`](../../apps/api/src/app.module.ts) | Root module importing all feature modules |
| **Database Connection & Client** | [`src/prisma/prisma.service.ts`](../../apps/api/src/prisma/prisma.service.ts) | PrismaClient lifecycle hooks (`$connect`, `$disconnect`) |
| **Database Schema & Models** | [`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) | PostgreSQL definitions, relationships, enums |
| **Authentication & Registration** | [`src/auth/auth.service.ts`](../../apps/api/src/auth/auth.service.ts) | Supabase GoTrue Auth registration & login |
| **Auth Routing & Endpoints** | [`src/auth/auth.controller.ts`](../../apps/api/src/auth/auth.controller.ts) | `POST /auth/register`, `POST /auth/login` |
| **JWT Verification Strategy** | [`src/auth/jwt.strategy.ts`](../../apps/api/src/auth/jwt.strategy.ts) | Passport strategy verifying Supabase JWT |
| **Auth & RBAC Guards** | [`src/auth/guards/jwt-auth.guard.ts`](../../apps/api/src/auth/guards/jwt-auth.guard.ts) | Bearer token validation and `@Roles()` enforcement |
| **Issue Business Logic & Dispatch**| [`src/issues/issues.service.ts`](../../apps/api/src/issues/issues.service.ts) | Round-robin auto-assignment, status state transitions |
| **Issue HTTP Endpoints** | [`src/issues/issues.controller.ts`](../../apps/api/src/issues/issues.controller.ts) | CRUD endpoints, file attachment upload, deletion |
| **Real-Time Gateway & Sockets** | [`src/realtime/realtime.gateway.ts`](../../apps/api/src/realtime/realtime.gateway.ts) | Socket.io server, room subscriptions, WebRTC signaling |
| **WebSocket Auth Guard** | [`src/realtime/ws-auth.guard.ts`](../../apps/api/src/realtime/ws-auth.guard.ts) | Handshake token validation |
| **SLA Escalation Engine** | [`src/escalation/escalation.service.ts`](../../apps/api/src/escalation/escalation.service.ts) | 30-min cron job escalating 2-hr unresolved issues |
| **User Hierarchy & Team Logic** | [`src/users/users.service.ts`](../../apps/api/src/users/users.service.ts) | Subordinate queries, team listing, user provisioning |
| **User HTTP Endpoints** | [`src/users/users.controller.ts`](../../apps/api/src/users/users.controller.ts) | `GET /users/team`, `GET /users/hierarchy`, `POST /users` |
| **Call State Tracking** | [`src/calls/calls.service.ts`](../../apps/api/src/calls/calls.service.ts) | Initiating calls, updating status, call logs |
| **Notifications Service** | [`src/notifications/notifications.service.ts`](../../apps/api/src/notifications/notifications.service.ts) | Notification persistence & WebSocket emission |
| **File Storage Service** | [`src/storage/local-storage.service.ts`](../../apps/api/src/storage/local-storage.service.ts) | Multipart file saving to `/uploads` disk |

---

## 2. Frontend Features & Views (`apps/web/`)

| User Interface View | Primary Page File | Key Components & Hooks Used |
| :--- | :--- | :--- |
| **Main Overview Dashboard** | [`src/app/page.tsx`](../../apps/web/src/app/page.tsx) | Live metric cards, MapLibre GL map, active ticket stream |
| **Issues Dashboard (`type=ISSUE`)**| [`src/app/issues/page.tsx`](../../apps/web/src/app/issues/page.tsx) | Card list, search, status progress, deletion |
| **Tasks Dashboard (`type=TASK`)** | [`src/app/tasks/page.tsx`](../../apps/web/src/app/tasks/page.tsx) | Card list, search, status progress, task execution |
| **Incident Reporting Form** | [`src/app/report/page.tsx`](../../apps/web/src/app/report/page.tsx) | HTML5 Geolocation capture, title/description, photo upload |
| **Live Interactive GIS Map** | [`src/app/map/page.tsx`](../../apps/web/src/app/map/page.tsx) | Fullscreen MapLibre canvas, active issue & staff GPS pins |
| **Team Directory & Hierarchy** | [`src/app/team/page.tsx`](../../apps/web/src/app/team/page.tsx) | Staff directory, direct report links, user addition modal |
| **WebRTC Communications Panel**| [`src/app/calls/page.tsx`](../../apps/web/src/app/calls/page.tsx) | Contact search, call dialer, call history |
| **Glassmorphism Landing Page** | [`src/app/landing/page.tsx`](../../apps/web/src/app/landing/page.tsx) | Showcase landing page with glassmorphism components |
| **Global Layout & Providers** | [`src/app/layout.tsx`](../../apps/web/src/app/layout.tsx) | AuthProvider, SocketProvider, CallProvider, Sidebar |

---

## 3. Shared Context & Client Providers (`apps/web/src/components/`)

| Provider Component | Implementation File | Responsibility |
| :--- | :--- | :--- |
| **`AuthProvider`** | [`AuthProvider.tsx`](../../apps/web/src/components/AuthProvider.tsx) | Token storage, login modal, demo role shortcuts |
| **`SocketProvider`** | [`SocketProvider.tsx`](../../apps/web/src/components/SocketProvider.tsx) | Socket.io connection lifecycle, reconnection handling |
| **`CallProvider`** | [`CallProvider.tsx`](../../apps/web/src/components/CallProvider.tsx) | WebRTC RTCPeerConnection, STUN servers, media streams |
| **`Sidebar`** | [`Sidebar.tsx`](../../apps/web/src/components/Sidebar.tsx) | Navigation links, user profile pill, notification drawer |

---

## 4. Client Utilities (`apps/web/src/lib/`)

| Utility | File | Responsibility |
| :--- | :--- | :--- |
| **`fetchAPI`** | [`src/lib/api.ts`](../../apps/web/src/lib/api.ts) | Fetch wrapper with Bearer token header injection & 401 handling |
| **`cn` / classNames** | [`src/lib/utils.ts`](../../apps/web/src/lib/utils.ts) | Tailwind class merging (`clsx` + `tailwind-merge`) |
