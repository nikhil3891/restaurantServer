# Architecture Decision Records (ADR)

A log of all significant architectural decisions made during the project, including the context, options considered, and the rationale for the final choice.

## What goes here
- ADR files named as `ADR-001-title.md`, `ADR-002-title.md`, etc.
- Each ADR documents one architectural decision

## ADR Template

```
# ADR-XXX: [Decision Title]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded  

## Context
What is the issue or situation that led to this decision?

## Options Considered
1. Option A — pros and cons
2. Option B — pros and cons

## Decision
What was decided and why?

## Consequences
What are the positive and negative results of this decision?
```

## Decision Log

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-prisma-over-typeorm.md) | Use Prisma instead of TypeORM | Accepted | 31 May 2026 |
| [ADR-002](./ADR-002-swagger-for-api-docs.md) | Use Swagger (OpenAPI) for API documentation | Accepted | 31 May 2026 |
| [ADR-003](./ADR-003-bullmq-over-rabbitmq.md) | Use BullMQ instead of RabbitMQ or Kafka | Accepted | 31 May 2026 |
| [ADR-004](./ADR-004-socketio-for-realtime.md) | Use Socket.IO for real-time features | Accepted | 31 May 2026 |
| [ADR-005](./ADR-005-nestjs-eventemitter-for-internal-events.md) | Use NestJS EventEmitter for internal module communication | Accepted | 31 May 2026 |
