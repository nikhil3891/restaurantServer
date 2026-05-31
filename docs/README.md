# Project Documentation

Central documentation hub for the **Restaurant ERP + Online Ordering + Multi-Branch Management System**.

---

## Folder Structure

| Folder | Purpose |
|--------|---------|
| [`requirements/`](./requirements/) | Business requirements, BRD, feature specs |
| [`architecture/`](./architecture/) | System design diagrams, architecture decisions |
| [`database/`](./database/) | ER diagrams, schema design, migration notes |
| [`api/`](./api/) | API contracts, endpoint references, Swagger specs |
| [`deployment/`](./deployment/) | Docker, local setup, CI/CD guides |
| [`guides/`](./guides/) | Developer onboarding, coding standards, workflows |
| [`adr/`](./adr/) | Architecture Decision Records |

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Business Requirements Document](./requirements/REQUIREMENTS.md) | Full project scope and feature list |
| [Product Hierarchy](./architecture/PRODUCT-HIERARCHY.md) | What we're building — full SaaS product tree |
| [Infrastructure](./architecture/INFRASTRUCTURE.md) | What to use and NOT use, with reasons |
| [Redis Design](./architecture/REDIS-DESIGN.md) | How Redis is used in this system |
| [Queue Design](./architecture/QUEUE-DESIGN.md) | BullMQ background jobs |
| [Real-Time Design](./architecture/REALTIME-DESIGN.md) | Socket.IO for kitchen and delivery tracking |
| [Event-Driven](./architecture/EVENT-DRIVEN.md) | Internal module communication pattern |
| [Monolith to Microservices](./architecture/MONOLITH-TO-MICROSERVICES.md) | V1 → V4 evolution strategy |
| [ER Design Guide](./database/ER-DESIGN-GUIDE.md) | Schema design principles, 7-step checklist |
| [API Testing Guide](./api/API-TESTING-GUIDE.md) | How to test every endpoint — Swagger, cURL, Postman |
| [Local Setup](./deployment/LOCAL-SETUP.md) | Docker setup for PostgreSQL and Redis |
| [Dev Log](./guides/DEV-LOG.md) | Daily development journal |

---

> Keep this documentation up to date as the project evolves.
