# Architecture

System design diagrams, high-level architecture decisions, and component interaction diagrams.

## Files

| File | Description |
|------|-------------|
| [PRODUCT-HIERARCHY.md](./PRODUCT-HIERARCHY.md) | Full SaaS product breakdown — what we're actually building |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | What infrastructure to use, what NOT to use and why |
| [MONOLITH-TO-MICROSERVICES.md](./MONOLITH-TO-MICROSERVICES.md) | V1→V4 evolution strategy using Strangler Fig pattern |
| [REDIS-DESIGN.md](./REDIS-DESIGN.md) | How Redis is used — caching, sessions, rate limiting, queues |
| [QUEUE-DESIGN.md](./QUEUE-DESIGN.md) | BullMQ queue design — all job types and processors |
| [REALTIME-DESIGN.md](./REALTIME-DESIGN.md) | Socket.IO real-time architecture — kitchen, tracking, delivery |
| [EVENT-DRIVEN.md](./EVENT-DRIVEN.md) | Internal event communication using NestJS EventEmitter |

## What goes here
- High-level system architecture diagrams
- Module interaction diagrams
- Data flow diagrams
- API Gateway design
- Sequence diagrams for critical flows (order placement, payment, etc.)
