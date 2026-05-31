# ADR-003: Use BullMQ Instead of RabbitMQ or Kafka

**Date:** 31 May 2026
**Status:** Accepted

---

## Context

The system needs background job processing for emails, SMS, PDF generation, analytics, and inventory jobs. Three options were evaluated.

---

## Options Considered

### Option A — RabbitMQ
**Pros:** Industry standard message broker, supports routing/fanout, durable queues
**Cons:** Requires a separate RabbitMQ server, adds infrastructure complexity, overkill for a single-process monolith

### Option B — Kafka
**Pros:** Designed for millions of events/sec, log-based storage, perfect for event sourcing
**Cons:** Extreme operational complexity (Zookeeper or KRaft, broker clusters), learning curve, completely unnecessary at current scale

### Option C — BullMQ (chosen)
**Pros:** Built on Redis (which we already have), battle-tested, excellent NestJS integration via `@nestjs/bull`, built-in retry/backoff, Bull Board UI for monitoring, cron job support
**Cons:** Tied to Redis, less powerful routing than RabbitMQ, single-broker by default

---

## Decision

**Use BullMQ** for all background job processing.

Since Redis is already part of our infrastructure for caching, sessions, and rate limiting, BullMQ adds zero additional infrastructure. One Redis instance serves both caching and queuing.

---

## Consequences

- All async jobs (email, SMS, PDF, analytics) use BullMQ queues
- Bull Board UI added for job monitoring at `/api/queues` in development
- When scaling requires multiple Redis nodes, switch to Redis Cluster
- When extracting Notifications to a microservice (V2), replace BullMQ jobs with RabbitMQ or Kafka topic consumers — the job payload shapes stay the same

---

## Evolution Trigger

Switch to RabbitMQ when: Multiple independent services need to consume the same event (pub/sub, not just a single worker queue).
Switch to Kafka when: Event volume exceeds 100k/hour and event replay or audit log is required.
