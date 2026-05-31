# ADR-004: Use Socket.IO for Real-Time Features

**Date:** 31 May 2026
**Status:** Accepted

---

## Context

The system needs real-time updates for kitchen screens, order tracking, and delivery tracking. Three options were evaluated.

---

## Options Considered

### Option A — Polling (Client polls every N seconds)
**Pros:** Simple, no WebSocket infrastructure needed
**Cons:** Wastes bandwidth, adds unnecessary DB load, 5-10 second delay is unacceptable for kitchen screens

### Option B — Server-Sent Events (SSE)
**Pros:** Simple one-way push, built into browsers, no library needed
**Cons:** One-directional (server → client only), no bidirectional communication (needed for driver location updates), connection limits

### Option C — Socket.IO (chosen)
**Pros:** Bidirectional communication, automatic reconnection, room support (perfect for branch/order/delivery groups), excellent NestJS integration via `@nestjs/websockets`, falls back to polling when WebSocket unavailable, scales with Redis adapter
**Cons:** Slightly heavier than raw WebSocket, requires connection management

---

## Decision

**Use Socket.IO** via `@nestjs/websockets` for all real-time features.

Socket.IO's room system maps perfectly to our use cases:
- `branch:{id}` room for kitchen screens
- `order:{id}` room for customer tracking
- `delivery:{id}` room for driver + customer location sharing

---

## Consequences

- All real-time events use Socket.IO
- Socket connections authenticated with the same JWT used for REST APIs
- When running multiple app instances, use `@socket.io/redis-adapter` (Redis already in infrastructure)
- Real-time gateways live in `src/modules/{module}/gateways/`

---

## Scaling

Socket.IO with `@socket.io/redis-adapter` allows multiple NestJS instances to share rooms via Redis pub/sub. No additional infrastructure needed — Redis is already running.
