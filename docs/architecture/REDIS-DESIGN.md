# Redis Design

How Redis is used in this system — what it stores, why, and what it must never store.

> **Core Rule:** Redis is a cache and utility layer. It is NOT a database.  
> Business data lives in PostgreSQL. Redis holds temporary, derived, or session data only.

---

## What Redis Is Used For

### 1. OTP Storage
- **What:** One-time passwords for phone/email verification
- **TTL:** 5 minutes
- **Key pattern:** `otp:{userId}` or `otp:{phone}`
- **Why Redis:** OTPs expire automatically with TTL — no cron job needed to clean up

### 2. Session Management
- **What:** User session tokens for web/mobile clients
- **TTL:** Matches JWT refresh token expiry (7 days)
- **Key pattern:** `session:{userId}:{sessionId}`
- **Why Redis:** Fast lookup on every request, easy to invalidate all sessions for a user

### 3. Rate Limiting
- **What:** Track how many requests a user/IP has made in a time window
- **TTL:** Per window (e.g. 60 seconds)
- **Key pattern:** `rate:{ip}` or `rate:{userId}:{endpoint}`
- **Why Redis:** Atomic increment (`INCR`) with TTL is the standard rate limiting pattern
- **Library:** `nestjs-throttler` with Redis store

### 4. Menu Cache
- **What:** Cached menu items and categories per branch
- **TTL:** 15 minutes (or invalidated on menu update)
- **Key pattern:** `menu:{branchId}`
- **Why Redis:** Menu is read hundreds of times per minute, rarely changes. DB reads avoided.

### 5. Analytics Cache
- **What:** Pre-computed dashboard stats (today's sales, order count, top items)
- **TTL:** 5 minutes
- **Key pattern:** `analytics:{restaurantId}:{date}:{metric}`
- **Why Redis:** Analytics queries are expensive DB aggregations — cache the result

### 6. Inventory Cache
- **What:** Current stock levels per branch for fast availability checks during ordering
- **TTL:** 2 minutes (short TTL — stock changes with every order)
- **Key pattern:** `inventory:{branchId}:{itemId}`
- **Why Redis:** Every online order checks ingredient availability. Cannot hit DB for each check at scale.

### 7. Branch Dashboard Cache
- **What:** Live KPI data shown on the branch manager's dashboard
- **TTL:** 1 minute
- **Key pattern:** `dashboard:{branchId}`
- **Why Redis:** Dashboard is refreshed every few seconds by the UI. Must not hit DB each time.

### 8. BullMQ Job Queue Backend
- **What:** Stores the job queue data for BullMQ (background jobs)
- **TTL:** Managed by BullMQ internally
- **Why Redis:** BullMQ is built on Redis. No extra infrastructure needed.

---

## What Redis Must NEVER Store

| ❌ Do NOT store | Reason |
|----------------|--------|
| User records | PostgreSQL is the source of truth |
| Order history | Orders are business data — PostgreSQL only |
| Invoice data | Financial records must be durable — PostgreSQL only |
| Inventory ledger | Stock movement history belongs in PostgreSQL |
| Any data that must survive a Redis restart | Redis can lose data. If it matters, it goes in PostgreSQL |

---

## Cache Invalidation Strategy

| Cache | When to invalidate |
|-------|-------------------|
| Menu cache | On any menu item create/update/delete |
| Inventory cache | On every order placed or stock update |
| Analytics cache | Let it expire naturally (TTL-based) |
| Dashboard cache | Let it expire naturally (TTL-based) |
| Session | On logout or password change |
| OTP | Automatically expires via TTL |

---

## Redis Key Naming Convention

```
{namespace}:{id}:{optional-subkey}

Examples:
  menu:branch_uuid_123
  inventory:branch_uuid_123:item_uuid_456
  analytics:restaurant_uuid_789:2026-05-31:revenue
  otp:user_uuid_123
  rate:192.168.1.1
  session:user_uuid_123:session_abc
```

---

## Redis in the Codebase

```
src/
└── infrastructure/
    └── redis/
        └── redis.module.ts     ← sets up Redis client using ioredis
```

**Library:** `ioredis` (for direct Redis operations) + `@nestjs/bull` (BullMQ integration)

---

## Summary Table

| Use Case | TTL | Invalidation |
|----------|-----|-------------|
| OTP | 5 min | Auto-expire |
| Session | 7 days | On logout |
| Rate limiting | 60 sec | Auto-expire |
| Menu cache | 15 min | On menu change |
| Analytics cache | 5 min | Auto-expire |
| Inventory cache | 2 min | On order/stock change |
| Branch dashboard | 1 min | Auto-expire |
| BullMQ queues | Managed by BullMQ | Job completion |
