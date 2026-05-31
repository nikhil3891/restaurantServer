# Infrastructure Design

What we use, what we don't use, and why.

> **Principle:** Use the simplest infrastructure that solves the problem.  
> Add complexity only when the current setup cannot handle the load.

---

## Version 1 Infrastructure (Current — Build This Now)

```
┌─────────────────────────────────────────────────┐
│  Docker Compose (Local Dev)                     │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ NestJS   │  │PostgreSQL│  │    Redis     │  │
│  │  :3000   │  │  :5432   │  │    :6379     │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  NGINX → NestJS (reverse proxy)                 │
└─────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Application | NestJS (Node.js) | REST API + WebSockets |
| Database | PostgreSQL 16 | All business data |
| Cache + Queue | Redis 7 | Sessions, caching, BullMQ |
| Background Jobs | BullMQ | Emails, PDFs, analytics jobs |
| Reverse Proxy | NGINX | SSL termination, load balancing |
| Containerization | Docker + Docker Compose | Dev/prod parity |

---

## What We Are NOT Using (And Why)

### ❌ Kafka
**Why not yet:** Kafka is designed for millions of events per second across many consumers. BullMQ + Redis handles tens of thousands of jobs per day — which is what we need for a restaurant platform in its early years. Kafka adds enormous operational complexity (Zookeeper, broker clusters, consumer groups, offset management) that slows down development.

**When to add:** When a single BullMQ queue is processing 500k+ jobs/day and Redis becomes a bottleneck.

---

### ❌ Kubernetes
**Why not yet:** Kubernetes is an orchestration platform for running hundreds of containers across many machines. We have 3 containers (app, postgres, redis). K8s would add 10x operational overhead with zero benefit at this scale.

**Evolution path:** Docker Compose (now) → Docker Swarm (when scaling to multiple servers) → Kubernetes (when managing 10+ microservices).

---

### ❌ RabbitMQ
**Why not yet:** RabbitMQ is a message broker needed when multiple independent services need to publish/subscribe to the same events across process boundaries. We are a single process — NestJS EventEmitter handles internal events. BullMQ handles async jobs. No cross-service messaging needed yet.

**When to add:** When extracting the Notifications microservice (Version 2) and it needs to consume events from the monolith.

---

### ❌ Service Mesh (Istio, Linkerd)
**Why not:** A service mesh manages traffic between 10+ microservices. We have 1 service.

---

### ❌ Distributed Transactions (Saga Pattern)
**Why not:** Distributed transactions are needed when multiple microservices must coordinate a single business transaction (e.g. Order Service + Payment Service + Inventory Service must all succeed or all rollback). We are in one process — PostgreSQL transactions handle atomicity perfectly.

---

### ❌ CQRS Everywhere
**Why not:** CQRS (Command Query Responsibility Segregation) means having separate read and write models. It's powerful but adds significant complexity. Apply it only where it makes sense — the Analytics module is a candidate since it only reads aggregated data.

---

## Production Infrastructure (Future — When Needed)

```
Internet
   ↓
CloudFront (CDN)
   ↓
WAF (Web Application Firewall)
   ↓
Load Balancer (AWS ALB)
   ↓
┌─────────────────────────────────┐
│  ECS / EC2 Auto Scaling Group   │
│  ┌──────────┐  ┌──────────┐    │
│  │ NestJS 1 │  │ NestJS 2 │    │ ← multiple app instances
│  └──────────┘  └──────────┘    │
└─────────────────────────────────┘
   ↓                    ↓
AWS RDS               AWS ElastiCache
(PostgreSQL Multi-AZ)  (Redis Cluster)
```

---

## Docker Setup (Current)

**`docker-compose.yml`** at project root runs:
- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`

**Daily commands:**
```bash
docker-compose up -d    # start
docker-compose stop     # stop (data saved)
docker-compose down -v  # nuclear option — deletes all data ⚠️
```

---

## NGINX (To Be Added)

NGINX will sit in front of NestJS and handle:
- SSL/TLS termination (HTTPS)
- Gzip compression
- Static file serving (if needed)
- Rate limiting at the network layer
- Proxying WebSocket connections

Will be added as a Docker service in `docker-compose.yml` when we set up production or staging.
