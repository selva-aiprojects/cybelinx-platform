# Cybelinx Central SaaS Platform

**Centralize SaaS plumbing — not business functionality.**

> **Java 21 + Spring Boot is the current and authoritative backend implementation.**
> The previous NestJS/Prisma implementation under `retired/` is reference-only —
> it is not built, tested, deployed or extended.

The Cybelinx platform is the autonomous, independent multi-tenant SaaS control plane for all 13+ Cybelinx software products (Jioplix, StoreAI, Synthalyst, LIMS, Smartbooks, StaySphere, Tradinx, Cartlinx, etc.). It centralizes SaaS plumbing: tenant registration, user identity, RBAC, subscription billing, resource resolution, provisioning, outbox events, and shared intelligence libraries. Product business data (`patients`, `clinical_encounters`, `store_orders`, `employees`, `payroll`, `hotel_bookings`, `trades`) stays inside decoupled product databases and is **never** touched by this repository.

### Product Integration Model & Domain Routing Archetypes

1. **Autonomous Control Plane**: Downstream products are independent external consumers, not internal code submodules. Product backends (FastAPI, Express, Go, etc.) live strictly in their respective repositories.
2. **Two Validated Domain Routing Archetypes**:
   - **Archetype A (Dedicated Standalone Apex Domain)**: `https://{tenant}.jioplix.com` — Proven & live with Jioplix HMS (`wellness.jioplix.com`, `nixon.jioplix.com`).
   - **Archetype B (Cybelinx Subdomain Network)**: `https://{tenant}.{product}.cybelinx.com` — Proven & live with StoreAI (`newage.storeai.cybelinx.com`), standard for all 12+ other Cybelinx products (`*.synthalyst.cybelinx.com`, `*.lims.cybelinx.com`, `*.smartbooks.cybelinx.com`, `*.staysphere.cybelinx.com`, `*.tradinx.cybelinx.com`, `*.cartlinx.cybelinx.com`, etc.).
3. **Master Reference Guide**: See [`docs/REFERENCE.md`](docs/REFERENCE.md) for the canonical architecture baseline and code change guardrails.

## Architecture in one paragraph

- **Control Plane API** (`backend/central-api`) — Spring Boot **modular monolith** (Java 21), REST under `/api/v1`, port `3001`.
- **Event Worker** (`backend/event-worker`) — separate deployable Spring Boot process (port `3002`).
- **Admin Portal** (`apps/admin-portal`) — Next.js App Router admin console.
- **Shared Packages** (`packages/`) — `@cybelinx/shared`, `@cybelinx/sdk`, `@cybelinx/core`, `@cybelinx/language`, `@cybelinx/ui`.
- **Domain Dictionaries** (`dictionaries/`) — 10 curated terminology dictionaries (healthcare, hrms, lims, finance, hospitality, realestate, trading, pharma, ecommerce, supplychain).
- **PostgreSQL 17** locally via Docker Compose; **Spring Data JPA/Hibernate** + **Flyway** migrations; PostgreSQL **transactional outbox** events.
- No Kafka/RabbitMQ/Redis/Databricks/Snowflake in Phase 1.

See [`docs/REFERENCE.md`](docs/REFERENCE.md) and [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) for the full
picture and boundary rules.

## Repo layout

```
backend/cybelinx-shared  Shared Java library (security, errors, health model)
backend/central-api      Control Plane API (Spring Boot, Maven module)
backend/event-worker     Event Worker (Spring Boot, Maven module)
apps/admin-portal        Admin console (Next.js)
packages/shared          Constants, error model, helpers (@cybelinx/shared)
packages/sdk             Multi-tenant SaaS integration SDK (@cybelinx/sdk)
packages/core            Formatters, national ID validators, async helpers (@cybelinx/core)
packages/language        Trie spell checker, 4-tier dictionary resolver (@cybelinx/language)
packages/ui              SmartTextEditor, input controls, design tokens (@cybelinx/ui)
dictionaries/            10 domain dictionaries (healthcare, hrms, lims, finance, etc.)
infra/                   Docker Compose, Dockerfiles, Postgres init, scripts
docs/                    PRDs / TRDs / architecture / API / Developer Tutorial
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

## Development auth (API tokens)

The platform authenticates requests with OIDC-JWT bearer tokens. For local
development set a shared HMAC secret and mint short-lived JWT tokens:

```bash
# 1. Set the shared HS256 key (must be >= 32 bytes), then restart the API
export IDP_JWT_SECRET=change-me-dev-only-32-bytes-minimum

# 2. Mint a dev token (defaults: sub seed-dev-admin-0001, 24h TTL)
npm run mint:jwt
#    or override:  npm run mint:jwt -- --sub seed-dev-admin-0001 --email dev.admin@cybelinx.test --ttl 24
```

Copy the printed token into the Admin Portal **Settings → API token** field
(it is stored in `localStorage`, never sent to the API as anything but a bearer
token). The DMZ `IDP_JWT_SECRET` path is HMAC-over-claims; a `jwks-uri` verifier can
be configured instead via `CYBELINX_IDP_JWKS_URI` when an OIDC provider is available.

The migration `V6__seed_reference_data.sql` seeds the reference catalog (regions,
roles, permissions incl. `product:write`, plans, entitlements), the ACME tenant and
the bootstrap identity `seed-dev-admin-0001` (`dev.admin@cybelinx.test`) with the
`CYBELINX_PLATFORM_ADMIN` and `TENANT_ADMIN` roles.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run test:backend` | Run all backend tests (Maven, `backend/pom.xml`) |
| `npm run dev:api` | Run central-api via `mvnw spring-boot:run` (port 3001) |
| `npm run dev:worker` | Run event-worker via `mvnw spring-boot:run` (port 3002) |
| `npm run dev:portal` | Run admin-portal (port 3000) |
| `npm run mint:jwt` | Mint a local dev JWT (see Development auth above) |
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

- **Master Reference**: [`docs/REFERENCE.md`](docs/REFERENCE.md) — Canonical platform invariants & code change guardrails
- **Developer Guide**: [`docs/DEVELOPER-TUTORIAL.md`](docs/DEVELOPER-TUTORIAL.md) — Step-by-step developer tutorial across 6 products
- **Integration Playbook**: [`docs/MULTI-PRODUCT-INTEGRATION-PLAYBOOK.md`](docs/MULTI-PRODUCT-INTEGRATION-PLAYBOOK.md) — Product tracking & SSO integration
- **Full Docs Index**: [`docs/`](docs/) — Complete documentation catalog
- **Progress Tracker**: [`progress.md`](progress.md) — Live milestone and delivery log