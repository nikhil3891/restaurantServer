# ADR-001: Use Prisma Instead of TypeORM

**Date:** 31 May 2026
**Status:** Accepted

---

## Context

The project needs an ORM/database toolkit for PostgreSQL. Two main options were considered for NestJS with PostgreSQL:

1. **TypeORM** — the default NestJS recommendation, decorator-based, already partially set up
2. **Prisma** — schema-first ORM with auto-generated TypeScript client

During the initial auth module build, TypeORM was used to get started quickly. However, after review, Prisma was chosen as the standard going forward.

---

## Options Considered

### Option A — TypeORM (current setup)
**Pros:**
- Already integrated in NestJS by default
- Decorator-based entities feel natural in NestJS
- Familiar to developers coming from Spring Boot / NestJS tutorials

**Cons:**
- Type safety is weaker — queries can return `any` in many cases
- Entity relationships and complex queries become verbose
- Migration tooling is less reliable than Prisma
- TypeORM 1.0 changed several APIs (breaking `select: []` and `relations: []` to object format) causing friction
- Harder to inspect the actual SQL being generated
- No single source of truth for the schema — entity files are scattered across modules

### Option B — Prisma (chosen)
**Pros:**
- Single `schema.prisma` file is the single source of truth for all tables
- Auto-generated fully-typed Prisma Client — no `any` types in queries
- Excellent migration tooling (`prisma migrate dev`, `prisma migrate deploy`)
- Prisma Studio — a visual DB browser for development
- Much cleaner query API (no decorator mess on entities)
- Better performance with efficient query batching
- First-class support for PostgreSQL features
- Easier to understand the DB schema at a glance

**Cons:**
- Requires learning the Prisma schema language (simple, 1-2 hours to learn)
- Slightly different pattern than NestJS's default TypeORM approach
- Need to replace the current TypeORM setup

---

## Decision

**Use Prisma** as the primary database ORM and migration tool for this project.

TypeORM code already written (User entity, RefreshToken entity, DatabaseModule) will be replaced when the Prisma migration is done.

---

## Implementation Plan

1. Install `prisma` and `@prisma/client`
2. Run `npx prisma init` to create `prisma/schema.prisma`
3. Define all models in `schema.prisma` (User, RefreshToken, and all future models)
4. Replace `infrastructure/database/database.module.ts` with a Prisma service
5. Create `src/infrastructure/database/prisma.service.ts` — a NestJS service wrapping `PrismaClient`
6. Replace all `@InjectRepository` usage with PrismaService injection
7. Remove TypeORM and `@nestjs/typeorm` packages

---

## Consequences

- All future modules use Prisma, not TypeORM
- Database schema is defined in one place: `prisma/schema.prisma`
- Migrations are run via `pnpm prisma migrate dev` in development
- The `User` and `RefreshToken` entities currently written as TypeORM entities will be converted to Prisma model definitions

---

*This decision replaces TypeORM with Prisma across the entire backend.*
