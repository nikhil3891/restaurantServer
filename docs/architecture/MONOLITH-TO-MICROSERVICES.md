# Modular Monolith to Microservices Migration Strategy

> **Document Version:** 1.0  
> **Created:** 31 May 2026  
> **Status:** Active — Reference before any architectural change

---

## Table of Contents

1. [Why We Start with Modular Monolith](#1-why-we-start-with-modular-monolith)
2. [What is a Modular Monolith](#2-what-is-a-modular-monolith)
3. [Rules We Follow in the Monolith Phase](#3-rules-we-follow-in-the-monolith-phase)
4. [When to Start Migrating](#4-when-to-start-migrating)
5. [Migration Strategy — The Strangler Fig Pattern](#5-migration-strategy--the-strangler-fig-pattern)
6. [Step-by-Step Migration Plan](#6-step-by-step-migration-plan)
7. [Module Extraction Order](#7-module-extraction-order)
8. [Inter-Service Communication](#8-inter-service-communication)
9. [Data Separation Strategy](#9-data-separation-strategy)
10. [Infrastructure Changes Required](#10-infrastructure-changes-required)
11. [What Stays the Same](#11-what-stays-the-same)
12. [Risks and How to Mitigate Them](#12-risks-and-how-to-mitigate-them)
13. [Migration Checklist per Service](#13-migration-checklist-per-service)

---

## 1. Why We Start with Modular Monolith

Starting directly with microservices is a common mistake for teams that haven't yet validated their domain boundaries.

| Problem with Early Microservices | Impact |
|----------------------------------|--------|
| Wrong service boundaries | Leads to chatty services, distributed monolith |
| Distributed complexity too early | Slows down development significantly |
| Operational overhead (K8s, service mesh) | Team spends more time on infra than features |
| Network latency between services | Performance degrades before the product is even stable |
| Hard to refactor across services | Design mistakes become expensive to fix |

**The Modular Monolith gives us:**
- Speed to build and iterate in early stages
- Clear module boundaries that directly map to future services
- Single deployment, easier debugging
- Lower infrastructure cost until scale is needed
- Real production data to decide which services to extract first

---

## 2. What is a Modular Monolith

A Modular Monolith is a single deployable application where the code is organized into **strictly isolated modules** — each module owns its own:

- Controllers
- Services
- Repositories
- DTOs and entities
- Database tables (logical ownership)
- Events it emits and consumes

Modules **never directly import** another module's service or repository. They only communicate through:
- Public module interfaces (exported services)
- Internal events (using NestJS EventEmitter)
- Shared DTOs passed across module boundaries

This discipline is what makes extraction into microservices possible later — because the boundaries are already clean.

```
src/
└── modules/
    ├── auth/           ← owns users, sessions, permissions
    ├── restaurant/     ← owns restaurant and branch data
    ├── inventory/      ← owns stock, suppliers, purchase orders
    ├── orders/         ← owns order lifecycle
    ├── payments/       ← owns transactions, settlements
    ├── employees/      ← owns staff, attendance, payroll
    ├── notifications/  ← owns all outbound communication
    └── analytics/      ← owns reporting and aggregated data
```

---

## 3. Rules We Follow in the Monolith Phase

These rules ensure the monolith stays clean and extraction is possible later:

1. **No cross-module repository access** — Module A never queries Module B's database tables directly.
2. **No circular module dependencies** — If A depends on B and B depends on A, redesign the boundary.
3. **Communicate via events for side effects** — e.g. when an order is placed, emit `order.placed` event; the inventory module listens and deducts stock.
4. **Each module has its own folder** with its own entities, DTOs, services, and controllers.
5. **Shared code goes in a `common/` or `shared/` module** — utilities, base classes, shared decorators.
6. **No shared database transactions across modules** — each module manages its own data consistency.
7. **Every public API of a module is explicitly exported** in its NestJS module definition.

---

## 4. When to Start Migrating

Do NOT migrate until at least **two or more** of these signals are true:

| Signal | Description |
|--------|-------------|
| Scale bottleneck | A specific module (e.g. Orders) is causing memory/CPU pressure that affects other modules |
| Independent deployment needed | A team needs to deploy the Payments module without affecting the rest |
| Different scaling requirements | Orders needs 10x more instances than Analytics |
| Team size growth | Multiple teams need to work on different modules without merge conflicts |
| Technology mismatch | A module needs a different language or runtime (e.g. Python for AI/ML) |
| Compliance isolation | Payments module needs to be in a PCI-DSS isolated environment |

**Suggested migration trigger point:**
- 10,000+ daily active users, OR
- Team grows beyond 5-6 backend engineers, OR
- Clear performance bottleneck in an isolated module

---

## 5. Migration Strategy — The Strangler Fig Pattern

We use the **Strangler Fig Pattern** — named after a tree that slowly grows around another tree until it replaces it.

```
Phase 1: Monolith handles everything
         [Client] → [API Gateway] → [Monolith]

Phase 2: Extract one service, route traffic via API Gateway
         [Client] → [API Gateway] → [Monolith]
                                  → [Orders Service] ← extracted

Phase 3: Extract more services one by one
         [Client] → [API Gateway] → [Auth Service]
                                  → [Orders Service]
                                  → [Payments Service]
                                  → [Monolith] ← shrinking

Phase 4: Monolith is gone, full microservices
         [Client] → [API Gateway] → [Auth Service]
                                  → [Restaurant Service]
                                  → [Orders Service]
                                  → [Payments Service]
                                  → [Inventory Service]
                                  → [Notification Service]
                                  → [Analytics Service]
```

**Key principle:** The monolith and new microservices run **side by side** during migration. Traffic is gradually shifted. There is no big-bang rewrite.

---

## 6. Step-by-Step Migration Plan

### Step 1 — Add an API Gateway (before extracting anything)
- Introduce NGINX or AWS API Gateway in front of the monolith
- All client traffic goes through the gateway
- This makes future service routing transparent to clients

### Step 2 — Harden module boundaries in the monolith
- Audit all cross-module imports and replace with event-based communication
- Ensure each module has a clearly defined public interface
- Add integration tests at module boundaries

### Step 3 — Extract the first service (lowest risk, highest independence)
- Pick a module with no or few dependencies on other modules
- Recommended first extraction: **Notification Service**
- Deploy it as a standalone NestJS app
- The monolith publishes events to a message queue (BullMQ → RabbitMQ → Kafka as scale grows)
- The notification service consumes those events

### Step 4 — Extract services one by one
- Follow the extraction order in Section 7
- For each extracted service: set up its own database, CI/CD pipeline, Docker image, and Kubernetes deployment

### Step 5 — Migrate shared database tables
- Each extracted service gets its own database/schema
- Use the **Database per Service** pattern
- Shared data is accessed via API calls or events, never direct DB joins across services

### Step 6 — Decommission monolith modules as services stabilize
- Once a service is stable in production, remove the equivalent module from the monolith
- Run both in parallel during a cutover window with feature flags

---

## 7. Module Extraction Order

Extract in this order — from least coupled to most coupled:

| Order | Module | Reason for this position |
|-------|--------|--------------------------|
| 1 | **Notification Service** | No upstream dependencies, purely event-driven |
| 2 | **Analytics Service** | Reads data, doesn't write to core tables; can use read replicas |
| 3 | **Inventory Service** | Relatively isolated, communicates via events |
| 4 | **Employee Service** | Independent HR domain |
| 5 | **Orders Service** | High traffic module — best ROI after scale pressure |
| 6 | **Payments Service** | Needs PCI-compliance isolation; extract for security too |
| 7 | **Restaurant/Branch Service** | Core config data, extract once above services are stable |
| 8 | **Auth Service** | Last because everything depends on it — extract with care |

---

## 8. Inter-Service Communication

### Synchronous (Request/Response)
Use for operations where the caller needs an immediate response.

- **Technology:** HTTP REST or gRPC
- **Use cases:** Auth token validation, fetching restaurant config, payment status check
- **Tool:** NestJS HTTP module, or `@nestjs/microservices` with gRPC transport

### Asynchronous (Event-Driven)
Use for operations that are side effects — the caller doesn't need to wait.

- **Technology:** BullMQ (early stage) → RabbitMQ → Kafka (at scale)
- **Use cases:** Order placed → deduct inventory, order placed → send notification, payment settled → update analytics

### Communication Rules
- Services never share a database
- Prefer async events over sync HTTP where possible
- Use a **service registry** or API Gateway for service discovery
- All inter-service HTTP calls go through the API Gateway, not direct IPs

---

## 9. Data Separation Strategy

### In the Monolith Phase
- All modules share one PostgreSQL database
- Each module uses its **own schema** (e.g. `auth.*`, `orders.*`, `inventory.*`)
- No cross-schema foreign key constraints — relationships are enforced in application code

### During Extraction
- Extracted service gets its **own PostgreSQL database instance**
- Data that the service needs from the monolith is:
  - Replicated via events (eventual consistency)
  - Or fetched via an API call (synchronous lookup)
- Run both databases in sync during the cutover window using the **dual-write pattern**

### After Extraction
- Each microservice owns its data completely
- Cross-service data is only accessible via the owning service's API
- Use **CQRS** (Command Query Responsibility Segregation) for read-heavy services like Analytics

---

## 10. Infrastructure Changes Required

| Component | Monolith Phase | Microservices Phase |
|-----------|---------------|---------------------|
| Deployment | Single Docker container | One container per service |
| Database | Single PostgreSQL instance | One DB per service (RDS multi-instance) |
| Message Queue | BullMQ (in-process Redis) | RabbitMQ or Kafka cluster |
| Service Discovery | Not needed | Kubernetes DNS or Consul |
| API Gateway | NGINX (reverse proxy) | AWS API Gateway or Kong |
| Monitoring | Single app logs | Distributed tracing (Jaeger/Zipkin) + per-service metrics |
| CI/CD | One pipeline | One pipeline per service |
| Secrets | Single .env / AWS Secrets Manager | Per-service secrets in K8s Secrets |

---

## 11. What Stays the Same

These things do NOT change during migration:

- **Client-facing API contracts** — URLs, request/response shapes stay the same (handled by API Gateway routing)
- **Authentication mechanism** — JWT tokens are valid across all services
- **Coding standards** — same NestJS patterns, same folder structure per service
- **Observability setup** — same logging format, same Prometheus metrics endpoints
- **Docker-based deployment** — every service is a Docker container from day one

---

## 12. Risks and How to Mitigate Them

| Risk | Mitigation |
|------|------------|
| Data inconsistency during migration | Use dual-write pattern + reconciliation jobs |
| Service latency increase | Profile before and after; use async where sync is not required |
| Wrong service boundaries | Validate boundaries against the monolith's module structure before extracting |
| Cascading failures between services | Implement circuit breakers (use `nestjs-circuitbreaker` or `opossum`) |
| Increased operational complexity | Invest in Kubernetes and monitoring before extracting services |
| Team knowledge gaps | Do one extraction as a learning exercise before extracting critical services |

---

## 13. Migration Checklist per Service

Use this checklist every time a new microservice is extracted:

- [ ] Module boundaries in monolith are fully clean (no cross-module direct DB access)
- [ ] All cross-module communication uses events or public service interfaces
- [ ] New service has its own Git repository (or monorepo workspace)
- [ ] New service has its own `Dockerfile`
- [ ] New service has its own CI/CD pipeline
- [ ] New service has its own database (schema or separate instance)
- [ ] New service has its own environment variables and secrets
- [ ] API Gateway routes updated to direct relevant traffic to new service
- [ ] Integration tests passing for all public endpoints of the new service
- [ ] Monitoring and alerting configured for new service
- [ ] Runbook written for new service (how to deploy, roll back, debug)
- [ ] Old module in monolith disabled behind a feature flag
- [ ] Old module in monolith fully removed after 2-week stability window

---

*Revisit and update this document before each service extraction.*
