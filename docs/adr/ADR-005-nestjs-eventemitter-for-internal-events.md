# ADR-005: Use NestJS EventEmitter for Internal Module Communication

**Date:** 31 May 2026
**Status:** Accepted

---

## Context

Modules need to communicate with each other for side effects (e.g. when an order is placed, inventory must be deducted, notifications must be sent, analytics must be recorded). The communication must be loosely coupled to preserve module independence.

---

## Options Considered

### Option A — Direct Service Injection (Tight Coupling)
**Pros:** Simple, easy to understand
**Cons:** OrderService imports InventoryService, NotificationService, AnalyticsService — creating circular dependency risk, slow responses, and impossible future extraction to microservices

### Option B — BullMQ Jobs for Internal Communication
**Pros:** Truly async, retryable
**Cons:** Overkill for in-process communication. Adding a Redis round-trip for every internal event adds latency with no benefit. BullMQ is for durable async jobs, not internal module signals.

### Option C — NestJS EventEmitter2 (chosen)
**Pros:** In-process pub/sub, zero latency, type-safe event classes, modules stay decoupled, `@OnEvent()` decorator is clean and readable, easy to migrate to message broker later
**Cons:** In-process only (not durable across restarts), not suitable for cross-service communication

---

## Decision

**Use `@nestjs/event-emitter` (EventEmitter2)** for all internal module-to-module communication.

This keeps modules decoupled. OrderService only emits `order.created` — it does not know or care who listens. Each listener module handles its own concern independently.

---

## Consequences

- `EventEmitterModule` added to `AppModule`
- All domain events are typed classes in `src/modules/{module}/events/`
- All event listeners are in `src/modules/{module}/listeners/`
- When extracting a module to a microservice, replace `@OnEvent()` with BullMQ/RabbitMQ consumer — payload shape stays the same
- This is NOT durable — if the process crashes mid-event, listeners that haven't run yet will not retry. For critical operations (e.g. payment completed → generate invoice), use BullMQ instead of EventEmitter.

---

## Rule: When to Use EventEmitter vs BullMQ

| Use EventEmitter | Use BullMQ |
|-----------------|-----------|
| Side effects that are informational | Operations that MUST succeed (invoice gen, email) |
| Analytics recording | PDF generation |
| Cache invalidation | SMS delivery |
| Dashboard refresh | Inventory reconciliation |
| Non-critical notifications | Any job that needs retry on failure |
