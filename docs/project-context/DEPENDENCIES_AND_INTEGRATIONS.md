# Dependencies & External Integrations

## 1. Third-Party Services & Integrations

| Service / Provider | Purpose | Integration Point |
| :--- | :--- | :--- |
| **Supabase GoTrue Auth** | Central user authentication & password hashing | `AuthService.ts` via `@supabase/supabase-js` Admin API (`admin.createUser`, `signInWithPassword`) |
| **Supabase PostgreSQL** | Cloud-hosted relational database | Prisma ORM via connection pooler (`DATABASE_URL`) & direct (`DIRECT_URL`) |
| **Google STUN Servers** | Public STUN servers for WebRTC NAT traversal | `CallProvider.tsx` (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`) |
| **Render Cloud Platform** | Hosting platform for backend web service | Root [`render.yaml`](../../render.yaml) blueprint |

---

## 2. Backend Dependencies (`apps/api/package.json`)

| Package | Version | Responsibility |
| :--- | :--- | :--- |
| `@nestjs/core` & `@nestjs/common` | `^12.0.1` | Core NestJS framework and dependency injection |
| `@nestjs/platform-express` | `^12.0.1` | HTTP web server adapter |
| `@nestjs/websockets` & `socket.io` | `^12.1.2` / `^4.8.4` | WebSocket real-time communication engine |
| `@nestjs/schedule` | `^12.0.2` | Cron task scheduler for 30-min SLA escalation engine |
| `@nestjs/passport` & `passport-jwt` | `^12.0.0` / `^4.0.1` | Passport JWT authentication guards |
| `@prisma/client` & `prisma` | `^5.22.0` / `^5.21.0` | Database schema modeling and PostgreSQL client |
| `@supabase/supabase-js` | `^2.45.0` | Official Supabase client for user admin APIs |
| `bcryptjs` | `^3.0.3` | Password hashing utility |
| `class-validator` & `class-transformer` | `^0.15.1` / `^0.5.1` | DTO validation and object mapping |
| `multer` | `^2.4.0` | Multipart form-data parser for file uploads |
| `vitest` | `^4.1.2` | Fast modern test runner replacing Jest |
| `oxlint` | `^1.58.0` | High-performance Rust-based linter |

---

## 3. Frontend Dependencies (`apps/web/package.json`)

| Package | Version | Responsibility |
| :--- | :--- | :--- |
| `next` | `^16.3.8` | Next.js App Router framework |
| `react` & `react-dom` | `19.2.8` | UI component library |
| `socket.io-client` | `^4.7.5` | Client-side WebSocket connection to NestJS |
| `maplibre-gl` & `react-map-gl` | `^6.11.2` / `^8.1.3` | Vector map rendering and React wrapper |
| `lucide-react` | `^1.51.0` | UI icon pack |
| `framer-motion` | `^14.0.0` | Animation engine for transitions and micro-interactions |
| `tailwindcss` | `^4` | Utility-first CSS engine |
| `zustand` | `^5.0.15` | Client state management |

---

## 4. Known Compatibility & Configuration Constraints

1. **MapLibre Web Worker CORS:** Serving MapLibre web worker directly from external CDNs can trigger browser security restrictions. The application serves the worker locally from `/public/maplibre-worker.mjs`.
2. **Next.js 16 App Router Conventions:** Server and client components must be explicitly delineated with `"use client"` directives for components requiring browser APIs (`localStorage`, `navigator.geolocation`, `Socket.io`).
3. **Vitest Native Config Warning:** Vitest configuration in `apps/api` uses CommonJS loading for ESM modules; Vite suggests using `.mjs` or setting `"type": "module"` in package.json in future versions.
