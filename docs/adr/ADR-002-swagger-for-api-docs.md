# ADR-002: Use Swagger (OpenAPI) for API Documentation

**Date:** 31 May 2026
**Status:** Accepted

---

## Context

This project has 9+ modules each with multiple REST API endpoints — auth, restaurants, menu, orders, payments, inventory, employees, delivery, notifications, analytics, and more. As the API grows, developers and frontend teams need a reliable, interactive reference for every endpoint.

---

## Options Considered

### Option A — Manual Documentation (Postman / README)
**Pros:** Quick to start with

**Cons:**
- Gets out of sync with code immediately
- No interactive testing
- No schema validation
- Not scalable across 100+ endpoints

### Option B — Swagger / OpenAPI via `@nestjs/swagger` (chosen)
**Pros:**
- Auto-generates documentation from NestJS decorators and DTOs
- Interactive UI at `/api/docs` — test endpoints directly in the browser
- Always in sync with the code (generated from source)
- Supports auth headers, request/response schemas, examples
- Industry standard — frontend devs and API consumers understand it
- Supports grouping endpoints by module (tags)

**Cons:**
- Requires adding `@ApiProperty()` decorators to DTOs
- Small overhead when adding new endpoints

---

## Decision

**Use Swagger via `@nestjs/swagger`** for all API documentation.

The Swagger UI will be accessible at:
```
http://localhost:3000/api/docs
```

---

## Implementation Plan

1. Install `@nestjs/swagger`
2. Set up `SwaggerModule` in `main.ts`:
   - Title: Restaurant ERP API
   - Version: 1.0
   - Bearer auth support (JWT)
   - Group endpoints by module tags
3. Add `@ApiProperty()` decorators to all DTOs
4. Add `@ApiTags()`, `@ApiBearerAuth()`, `@ApiOperation()`, `@ApiResponse()` to all controllers

---

## Swagger Setup (will be added to main.ts)

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Restaurant ERP API')
  .setDescription('Complete API documentation for the Restaurant ERP system')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## Consequences

- All DTOs will have `@ApiProperty()` decorators
- All controllers will have `@ApiTags()` and `@ApiOperation()` decorators
- Interactive API docs available locally at `/api/docs` during development
- In production, Swagger can be disabled by environment variable

---

*Swagger setup will be done alongside the Prisma migration in the next development session.*
