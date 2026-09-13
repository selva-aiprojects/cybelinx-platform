# Cybelinx Central SaaS Platform

**Centralize SaaS plumbing — not business functionality.**

> **Java 21 + Spring Boot is the current and authoritative backend implementation.**
> The previous NestJS/Prisma implementation under `retired/` is reference-only —
> it is not built, tested, deployed or extended.

The Cybelinx platform is the single control plane for all Cyclinx products
(Jioplix, Jioplix Smart). It owns tenant, identity, RBAC, entitlement, tenant
resource, provisioning and event plumbing. Product business data (`patients`,
`doctors`, `appointments`, `lab samples`, ...) stays inside the products and is
**never** touched by this repository.

## Architecture in one paragraph

- **Control Plane API** (`backend/central-api`) — Spring Boot **modular monolith** (Java 21), REST under `/api/v1`, port `3001`.
- **Event Worker** (`backend/event-worker`) — separate deployable Spring Boot process (port `3002`).
- **Admin Portal** (`apps/admin-portal`) — Next.js App Router admin console.
- **Shared package** (`packages/shared`) — constants, error model, helpers (TypeScript).
- **PostgreSQL 17** locally via Docker Compose; **Spring Data JPA/Hibernate** + **Flyway** migrations; PostgreSQL **transactional outbox** events.
- No Kafka/RabbitMQ/Redis/Databricks/Snowflake in Phase 1.

See [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) for the full
picture and boundary rules.

## Repo layout

```
backend/cybelinx-shared  Shared Java library (security, errors, health model)
backend/central-api      Control Plane API (Spring Boot, Maven module)
backend/event-worker     Event Worker (Spring Boot, Maven module)
apps/admin-portal        Admin console (Next.js)
packages/shared          Constants, error model, helpers (TypeScript)
infra/                   Docker Compose, Dockerfiles, Postgres init, scripts
docs/                    PRD / TRD / architecture / API / ADRs
retired/                 Pre-cutover TypeScript backend (reference only, not built)
```

## Prerequisites

- JDK 21 (any distribution; Microsoft OpenJDK, Temurin, ...)
- Node.js ≥ 20.9 (recommended 24.x)
- npm ≥ 10 (recommended 11.x)
- Docker Desktop (for local PostgreSQL)

## Getting started

```bash
# 1. Install frontend workspace deps (admin-portal + shared; one lockfile at root)
npm install

# 2. Start local PostgreSQL
npm run db:up

# 3. Build the Java backend (Maven wrapper; run all tests too)
npm run test:backend
```

`backend/` is not part of the npm workspaces. Build it with `.\backend\mvnw.cmd`
(Windows) or `./backend/mvnw` (Unix) from the repo root.

### Run locally

```bash
npm run dev:api      # Control Plane API → http://localhost:3001/api/v1
npm run dev:worker   # Event Worker      → http://localhost:3002/api/v1
npm run dev:portal   # Admin Portal      → http://localhost:3000
```

Health checks: `GET /api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`.
Swagger/OpenAPI lives at `GET /api/v1/docs`.

### Stop the database

```bash
npm run db:down      # stops postgres (volume preserved)
```

## Environment

Copy `.env.example` to `.env`. The dev defaults already work with the local
compose stack:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/cybelinx_platform
SPRING_DATASOURCE_USERNAME=cybelinx
SPRING_DATASOURCE_PASSWORD=cybelinx_dev_password
API_PORT=3001
WORKER_PORT=3002
```

Secrets are never committed. Only credential **references** are stored by the platform.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run test:backend` | Run all backend tests (Maven, `backend/pom.xml`) |
| `npm run dev:api` | Run central-api via `mvnw spring-boot:run` (port 3001) |
| `npm run dev:worker` | Run event-worker via `mvnw spring-boot:run` (port 3002) |
| `npm run build` | Build `packages/shared` + admin-portal |
| `npm run lint` | ESLint (flat config) across frontend workspaces |
| `npm run typecheck` | `tsc --noEmit` across frontend workspaces |
| `npm test` | Jest across frontend workspaces |
| `npm run check` | Everything frontend (build → lint → typecheck → test) |

## Database

- Local: `postgres:17-alpine` via Docker Compose (`infra/docker/docker-compose.yml`).
- Roles bootstrap (least privilege): `infra/postgres/init/01-create-roles.sql`.
- **Flyway** migrations live in `backend/central-api/src/main/resources/db/migration/`:
  - `V1__init_platform_schema.sql` — full metadata-only schema (ported from the Prisma migration).
  - `V2__lowercase_enum_types.sql` — renames PG enum types to lowercase (Hibernate named-enum casts).
- Hibernate runs with `ddl-auto: validate`; schema changes go through Flyway only.
- The API connects lazily — it boots even when Postgres is down; `/health/ready` reports `503`.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR with two jobs:
`java-backend` (Postgres service + `./backend/mvnw test`) and `admin-portal`
(`npm ci` → typecheck → lint → build → test).

## Documentation

- [`docs/`](docs/) — index of all docs
- PRD: [`Cybelinx Central SaaS Platform — Phase 1 PRD`](docs/Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md)
- TRD: [`Cybelinx_Phase1_TRD_v1.1_Updated`](docs/Cybelinx_Phase1_TRD_v1.1_Updated.md)
- Progress: [`progress.md`](progress.md)