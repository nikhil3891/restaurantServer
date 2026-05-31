# Development Log

Daily record of what was built, where it lives, and why decisions were made.

---

## 31 May 2026 — Project Foundation + Auth Module

### What We Did

#### 1. Created the Project Requirements Document
- **File:** `docs/requirements/REQUIREMENTS.md`
- **Why:** Before writing a single line of code, we needed a single source of truth for every feature, every module, every technical decision, and the full business scope. This document will be referenced throughout the entire project.
- **What it covers:** 34 sections — business goals, all modules, user roles, tech stack, learning roadmap, architecture approach, development steps.

#### 2. Created Documentation Folder Structure
- **Folder:** `docs/`
- **Subfolders:** `requirements/`, `architecture/`, `database/`, `api/`, `deployment/`, `guides/`, `adr/`
- **Why:** Enterprise projects need organized documentation. Each folder has a dedicated purpose — you always know where to find and add docs as the project grows.

#### 3. Wrote Monolith-to-Microservices Migration Strategy
- **File:** `docs/architecture/MONOLITH-TO-MICROSERVICES.md`
- **Why:** We are starting as a Modular Monolith (not microservices). This doc explains the Strangler Fig migration pattern, module extraction order, data separation strategy, and a checklist to follow before extracting each service.
- **Key decision:** Extract Notifications first (fewest dependencies), Auth last (everything depends on it).

#### 4. Wrote NestJS Boot Process Guide
- **File:** `docs/guides/HOW-NESTJS-WORKS.md`
- **Why:** Documented the full flow of what happens when `pnpm run start:dev` is run — from CLI → TypeScript compiler → IoC container → HTTP server → request lifecycle. Useful reference for understanding NestJS internals.

#### 5. Designed and Implemented the Folder Architecture
- **Location:** `src/`
- **Why we restructured:** The initial folder setup had several wrong placements:
  - `branches/` should be inside `restaurants/` (same domain)
  - `kitchen/` should be inside `orders/` (KOT is part of order execution)
  - `attendance/` + `payroll/` should be inside `employees/` (subdomains)
  - `purchases/` + `suppliers/` should be inside `inventory/`
  - `roles/` + `permissions/` belong inside `users/` (RBAC concern)
  - `redis/` at root level was wrong — moved to `infrastructure/redis/`
  - `billing/` merged into `payments/`, `reports/` merged into `analytics/`, `staff/` removed (duplicate of `employees/`)
- **Final structure:** 14 domain modules + `config/`, `infrastructure/`, `common/`, `shared/`

#### 6. Built the Auth Module (Full Implementation)
- **Files:** `src/modules/auth/` + `src/modules/users/`

**What was built:**

| File | Purpose |
|------|---------|
| `shared/enums/user-role.enum.ts` | 7 user roles: SuperAdmin, RestaurantOwner, BranchManager, Cashier, KitchenStaff, DeliveryStaff, Customer |
| `shared/dto/api-response.dto.ts` | Standard API response shape: `{ success, statusCode, message, data }` |
| `common/decorators/current-user.decorator.ts` | `@CurrentUser()` — extracts user from JWT-authenticated request |
| `common/decorators/public.decorator.ts` | `@Public()` — marks a route as public, bypasses JWT guard |
| `common/decorators/roles.decorator.ts` | `@Roles(UserRole.ADMIN)` — restricts a route to specific roles |
| `common/filters/http-exception.filter.ts` | Global error handler — catches all exceptions, returns consistent error response |
| `common/guards/jwt-auth.guard.ts` | Global JWT guard — applied to every route unless `@Public()` is used |
| `common/guards/roles.guard.ts` | Global RBAC guard — checks user role against `@Roles()` metadata |
| `config/app.config.ts` | App port, environment, API prefix |
| `config/database.config.ts` | PostgreSQL connection settings |
| `config/jwt.config.ts` | JWT secrets and token expiry durations |
| `infrastructure/database/database.module.ts` | TypeORM async setup using ConfigService |
| `modules/users/entities/user.entity.ts` | User table — hashes password automatically via `@BeforeInsert` |
| `modules/users/services/users.service.ts` | Create user, find by email, find by ID |
| `modules/users/users.module.ts` | Users module, exports UsersService for use in AuthModule |
| `modules/auth/entities/refresh-token.entity.ts` | Stores refresh tokens in DB with expiry and revocation flag |
| `modules/auth/strategies/local.strategy.ts` | Passport Local strategy — validates email + password on login |
| `modules/auth/strategies/jwt.strategy.ts` | Passport JWT strategy — validates Bearer token on protected routes |
| `modules/auth/services/auth.service.ts` | register, login, refreshTokens, logout, getProfile |
| `modules/auth/controllers/auth.controller.ts` | 5 endpoints: register, login, refresh, logout, me |
| `modules/auth/auth.module.ts` | Wires JWT, Passport, TypeORM, UsersModule together |
| `app.module.ts` | Root module — global ConfigModule, DatabaseModule, AuthModule, global guards and filter |
| `main.ts` | Updated — global ValidationPipe, CORS, API prefix `api/v1` |

**Auth endpoints built:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user, returns access + refresh tokens |
| POST | `/api/v1/auth/login` | Public | Login with email/password, returns tokens |
| POST | `/api/v1/auth/refresh` | Public | Exchange refresh token for new access token |
| POST | `/api/v1/auth/logout` | JWT Required | Revoke all refresh tokens for user |
| GET | `/api/v1/auth/me` | JWT Required | Get current user profile |

**Token strategy:**
- Access token: 15 minutes (JWT, stateless)
- Refresh token: 7 days (stored in `refresh_tokens` table, can be revoked)

#### 7. Packages Installed
```
@nestjs/jwt @nestjs/passport passport passport-jwt passport-local
bcrypt class-validator class-transformer @nestjs/config typeorm @nestjs/typeorm pg
```

---

---

## 31 May 2026 — Prisma Migration + Swagger Integration

### What We Did

#### 1. Migrated from TypeORM → Prisma

**Why:** Prisma 7 has far better type safety, a single schema file as the source of truth, and superior migration tooling. TypeORM was causing API friction (changed `select: []` and `relations: []` to object format in 1.0). See `docs/adr/ADR-001-prisma-over-typeorm.md`.

**Important:** We installed Prisma 7 which has a breaking change from all earlier versions — the database URL is no longer written in `schema.prisma`. Instead it lives in a `prisma.config.ts` file at the project root. The PrismaClient at runtime uses `@prisma/adapter-pg` to get the connection.

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Created — defines `User`, `RefreshToken` models and `UserRole` enum. No `url` in datasource (Prisma 7 breaking change) |
| `prisma.config.ts` | Created at project root — holds `DATABASE_URL` for CLI migrations |
| `infrastructure/database/prisma.service.ts` | Created — NestJS service extending PrismaClient, uses `@prisma/adapter-pg` for runtime DB connection |
| `infrastructure/database/database.module.ts` | Replaced TypeORM module — now a `@Global()` module exporting PrismaService |
| `modules/users/entities/user.entity.ts` | Deleted — replaced by Prisma-generated `User` type from `@prisma/client` |
| `modules/auth/entities/refresh-token.entity.ts` | Deleted — replaced by Prisma-generated `RefreshToken` type |
| `modules/users/services/users.service.ts` | Fully rewritten with Prisma Client queries |
| `modules/users/users.module.ts` | Removed `TypeOrmModule.forFeature` — uses global PrismaService |
| `modules/auth/services/auth.service.ts` | Fully rewritten with Prisma Client queries |
| `modules/auth/auth.module.ts` | Removed TypeORM imports |
| `shared/enums/user-role.enum.ts` | Now re-exports `UserRole` from `@prisma/client` — single source of truth |
| `.env` | Added `DATABASE_URL` (Prisma connection string format) |

**Packages added:** `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `dotenv`
**Packages removed:** `typeorm`, `@nestjs/typeorm`

**Key Prisma 7 learnings:**
- `prisma.config.ts` is mandatory — holds the DB URL for CLI (migrations, introspection)
- PrismaClient at runtime needs the pg adapter: `new PrismaPg({ connectionString })`
- `import type { User } from '@prisma/client'` — must use `import type` due to `isolatedModules: true` in tsconfig

#### 2. Added Swagger API Documentation

**Why:** As the API grows to 100+ endpoints across 14 modules, we need interactive, always-up-to-date API docs. See `docs/adr/ADR-002-swagger-for-api-docs.md`.

| File | Change |
|------|--------|
| `main.ts` | Swagger setup added — `DocumentBuilder` with bearer auth, available at `/api/docs` in non-production |
| `auth/dto/register.dto.ts` | Added `@ApiProperty()` with examples |
| `auth/dto/login.dto.ts` | Added `@ApiProperty()` with examples |
| `auth/dto/refresh-token.dto.ts` | Added `@ApiProperty()` |
| `auth/dto/auth-response.dto.ts` | Added `@ApiProperty()` |
| `auth/controllers/auth.controller.ts` | Added `@ApiTags('Auth')`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()` |

**Swagger UI:** `http://localhost:3000/api/docs` (development only, disabled in production)

**Package added:** `@nestjs/swagger`

---

---

## 31 May 2026 — Architecture Design Sprint (Evening Session)

> This session was a full architectural review. No new NestJS code was written.  
> The goal was to define the "how it works" for Redis, queues, real-time, and internal events — so that when we write code, we write it right the first time.

---

### Why This Session Was Important

Before building more modules (Restaurant, Menu, Orders), we needed to answer:
- How will modules communicate without becoming tightly coupled?
- How will background jobs (email, PDF, analytics) work without blocking HTTP responses?
- How will kitchen screens and delivery tracking update in real time?
- What infrastructure do we actually need right now vs what we add later?
- What are we actually building at the product level?

Without answers to these, every module we built would have been wrong at the architectural level — requiring expensive rewrites later.

---

### Decisions Made and Documents Created

#### 1. Updated: MONOLITH-TO-MICROSERVICES.md — Added Versioned Evolution Plan
- **File:** `docs/architecture/MONOLITH-TO-MICROSERVICES.md`
- **What was added:** Section 14 — V1 → V4 evolution plan with clear triggers for each extraction
- **Why updated:** The original document described the Strangler Fig pattern in general terms. We now have a specific, named plan: V1 (Modular Monolith), V2 (Extract Notifications), V3 (Extract Analytics), V4 (Extract Ordering).
- **Key decisions documented:**
  - What we will NOT do (Kafka, K8s, Service Mesh, Distributed Transactions, CQRS everywhere) with specific reasons
  - Notifications extracted first because it has zero dependencies and is purely event-driven
  - Ordering extracted last because it has the most inter-module dependencies

---

#### 2. Created: REDIS-DESIGN.md
- **File:** `docs/architecture/REDIS-DESIGN.md`
- **Why created:** Redis is already running in Docker, but without a clear design document, developers might start storing business data in Redis or skip caching entirely. This doc establishes the rules.
- **Key rule documented:** Redis is a cache and utility layer — NOT a database. Business data stays in PostgreSQL.
- **8 use cases defined:** OTP (5min TTL), Sessions (7d TTL), Rate Limiting, Menu Cache (15min), Analytics Cache (5min), Inventory Cache (2min), Branch Dashboard (1min), BullMQ queue backend
- **Key naming convention:** `{namespace}:{id}:{optional-subkey}` — e.g. `menu:branch_uuid_123`

---

#### 3. Created: QUEUE-DESIGN.md
- **File:** `docs/architecture/QUEUE-DESIGN.md`
- **Why created:** We needed to decide what job processor to use (BullMQ vs RabbitMQ vs Kafka) and document exactly which jobs go in which queues before writing any processor code.
- **Decision: BullMQ** — already backed by Redis, no extra infrastructure, excellent NestJS integration. See ADR-003.
- **4 queues defined:**
  - `notifications` — Email, SMS, WhatsApp, Push
  - `documents` — Invoice PDF, Report PDF
  - `analytics` — Daily analytics cron, dashboard cache refresh
  - `inventory` — Reconciliation, low-stock alerts, auto purchase orders
- **Retry strategy documented:** 4 attempts with exponential backoff → Dead Letter Queue

---

#### 4. Created: REALTIME-DESIGN.md
- **File:** `docs/architecture/REALTIME-DESIGN.md`
- **Why created:** Real-time is a fundamental requirement (kitchen screens, order tracking, delivery). Without a design doc, developers might poll the DB instead — which would not scale. Socket.IO was chosen for its room system and NestJS integration. See ADR-004.
- **4 event flows documented:** Order Created → Kitchen, Order Ready → Customer, Delivery Assigned → Driver + Customer, Driver Location Updates
- **Room strategy defined:** `branch:{id}`, `kitchen:{id}`, `order:{id}`, `delivery:{id}`, `restaurant:{id}`
- **Scaling path:** `@socket.io/redis-adapter` for horizontal scaling — uses the Redis we already have

---

#### 5. Created: EVENT-DRIVEN.md
- **File:** `docs/architecture/EVENT-DRIVEN.md`
- **Why created:** This is the most important architectural pattern for keeping modules decoupled. Without documenting it, every developer will default to injecting services directly — creating tight coupling that makes microservice extraction impossible later. See ADR-005.
- **Core pattern:** Services emit typed event classes. Other modules subscribe with `@OnEvent()`. The emitter never knows who's listening.
- **Full event catalog documented:** Order, Payment, Inventory, User, and Delivery events with emitters and listeners
- **Rule added:** EventEmitter for informational side effects, BullMQ for critical operations that must not be lost

---

#### 6. Created: INFRASTRUCTURE.md
- **File:** `docs/architecture/INFRASTRUCTURE.md`
- **Why created:** A clear "use this, NOT that" document prevents premature complexity. The temptation to add Kafka, K8s, or Service Mesh early is real — this doc explains exactly why each technology is deferred and what the trigger for adding it would be.
- **V1 stack confirmed:** Docker, PostgreSQL, Redis, NestJS, BullMQ, NGINX. Nothing else.
- **Future production architecture sketched:** CDN → WAF → Load Balancer → ECS Auto Scaling → RDS Multi-AZ + ElastiCache

---

#### 7. Created: PRODUCT-HIERARCHY.md
- **File:** `docs/architecture/PRODUCT-HIERARCHY.md`
- **Why created:** The BRD lists 34 sections of requirements but doesn't present the product as a visual hierarchy. This doc shows the complete product structure — what we're building is a Restaurant SaaS Platform with 9 major product areas. Every module we build maps to a specific node in this hierarchy.
- **7 product areas defined:** Core ERP, Restaurant Operations, Online Ordering, Franchise Management, Payments, Analytics, Third-Party Integrations, AI Layer
- **Module → Product mapping table created** — makes onboarding new developers much easier
- **Multi-tenant strategy documented:** Every piece of data has a defined owner (Platform, Restaurant, or Branch)

---

#### 8. Created: ER-DESIGN-GUIDE.md
- **File:** `docs/database/ER-DESIGN-GUIDE.md`
- **Why created:** Without this guide, developers write NestJS code first and design the schema as they go — leading to messy schemas, missing indexes, and poor normalization. This doc enforces the "design the schema first" discipline with a 7-step checklist per module.
- **Module build order established:** 21 modules in dependency order (Auth first, Compliance last)
- **Schema principles documented:** UUID PKs, createdAt/updatedAt on every table, soft deletes, tenancy columns, index FK columns, use PostgreSQL enums
- **High-level schema planned** for all major tables across 8 domain areas

---

#### 9. Created: ADR-003, ADR-004, ADR-005
- **ADR-003:** `docs/adr/ADR-003-bullmq-over-rabbitmq.md` — Use BullMQ instead of RabbitMQ or Kafka
- **ADR-004:** `docs/adr/ADR-004-socketio-for-realtime.md` — Use Socket.IO for real-time features
- **ADR-005:** `docs/adr/ADR-005-nestjs-eventemitter-for-internal-events.md` — Use NestJS EventEmitter for internal events

---

### Summary of All Documents Now in docs/

| Document | Status |
|----------|--------|
| `docs/requirements/REQUIREMENTS.md` | ✅ Complete |
| `docs/architecture/PRODUCT-HIERARCHY.md` | ✅ New |
| `docs/architecture/INFRASTRUCTURE.md` | ✅ New |
| `docs/architecture/MONOLITH-TO-MICROSERVICES.md` | ✅ Updated (V1→V4 added) |
| `docs/architecture/REDIS-DESIGN.md` | ✅ New |
| `docs/architecture/QUEUE-DESIGN.md` | ✅ New |
| `docs/architecture/REALTIME-DESIGN.md` | ✅ New |
| `docs/architecture/EVENT-DRIVEN.md` | ✅ New |
| `docs/database/ER-DESIGN-GUIDE.md` | ✅ New |
| `docs/adr/ADR-001` through `ADR-005` | ✅ 5 decisions recorded |
| `docs/deployment/LOCAL-SETUP.md` | ✅ Complete |
| `docs/guides/HOW-NESTJS-WORKS.md` | ✅ Complete |

---

## Upcoming

### Next Module to Build — Restaurants & Branches
- **Pre-coding checklist status:**
  - [ ] ER diagram for `restaurants` and `branches` tables
  - [ ] RBAC design (SuperAdmin creates restaurants, Owner manages own)
  - [ ] Multi-tenant column strategy confirmed
  - [ ] API contract defined
- **Why this is next:** Every other module (Menu, Orders, Inventory, Employees) has a foreign key to either `restaurantId` or `branchId`. This module must exist before any other business module can be built.

---

*Update this log at the end of every development session.*
