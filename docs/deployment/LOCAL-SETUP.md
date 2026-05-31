# Local Development Setup Guide

How to run this project on your local machine using Docker for databases.

> You do NOT need to install PostgreSQL or Redis manually.
> Docker runs them as containers. Your NestJS app runs directly on your laptop.

---

## What Runs Where

```
Your Laptop
│
├── NestJS App          → runs normally with pnpm run start:dev
│                          connects to localhost:3000
│
└── Docker Desktop
    ├── PostgreSQL       → localhost:5432  (restaurant_db)
    └── Redis            → localhost:6379
```

---

## Step 1 — Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop

- After install, **restart your laptop**
- Open Docker Desktop and make sure it shows "Docker is running" (green icon in taskbar)

---

## Step 2 — Start the Databases

Open a terminal in the project root and run:

```bash
docker-compose up -d
```

The `-d` flag runs them in the background (detached mode).

**First time only** — Docker will download the PostgreSQL and Redis images (~100MB). This takes 1-2 minutes. After that it's instant.

To verify both containers are running:

```bash
docker-compose ps
```

You should see:

```
NAME                    STATUS
restaurant_postgres     running
restaurant_redis        running
```

---

## Step 3 — Run Prisma Migrations (First Time Only)

This creates the database tables from your `prisma/schema.prisma`:

```bash
pnpm prisma migrate dev --name init
```

You only need to do this once, or whenever you add new models to the schema.

---

## Step 4 — Start the NestJS App

```bash
pnpm run start:dev
```

The terminal will show:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 API Base    →  http://localhost:3000/api/v1
 Health      →  http://localhost:3000/api/v1/health
 Swagger     →  http://localhost:3000/api/docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Daily Workflow

Every day when you start working:

```bash
# 1. Start databases (if not already running)
docker-compose up -d

# 2. Start the app
pnpm run start:dev
```

When you're done for the day:

```bash
# Stop the app: Ctrl+C in the terminal

# Stop containers (data is saved)
docker-compose stop
```

---

## Useful Docker Commands

| Command | What it does |
|---------|-------------|
| `docker-compose up -d` | Start all containers in background |
| `docker-compose stop` | Stop containers (data is saved) |
| `docker-compose down` | Stop AND remove containers (data is saved in volumes) |
| `docker-compose down -v` | Stop AND delete everything including data ⚠️ |
| `docker-compose ps` | List running containers |
| `docker-compose logs postgres` | View PostgreSQL logs |
| `docker-compose logs redis` | View Redis logs |

---

## Prisma Commands

| Command | What it does |
|---------|-------------|
| `pnpm prisma migrate dev --name <name>` | Create and run a new migration |
| `pnpm prisma migrate dev` | Apply any pending migrations |
| `pnpm prisma generate` | Regenerate Prisma Client after schema change |
| `pnpm prisma studio` | Open visual DB browser at localhost:5555 |
| `pnpm prisma db push` | Push schema to DB without creating migration files (for prototyping) |

---

## Troubleshooting

**"Cannot connect to Docker daemon"**
→ Docker Desktop is not running. Open it from the Start menu and wait for "Docker is running".

**"Error: Port 5432 is already in use"**
→ You might have a local PostgreSQL already installed. Stop it or change the port in `docker-compose.yml` and `.env`.

**"Database connection failed" in the app**
→ Make sure `docker-compose up -d` was run first. Check `docker-compose ps`.

**Data disappeared after `docker-compose down -v`**
→ The `-v` flag deletes volumes. Re-run `pnpm prisma migrate dev` to recreate tables.
