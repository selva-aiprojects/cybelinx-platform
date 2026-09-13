# Architecture

> The canonical architecture lives in the
> [PRD](../Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md) and
> [TRD](../Cybelinx_Phase1_TRD_v1.2_Java_Spring_Updated.md). This document captures the
> *implemented* architecture and the boundaries it enforces.

## Authoritative backend statement

> **Java 21 + Spring Boot is the current and authoritative backend implementation.**
> The previous NestJS/Prisma implementation under `retired/` is reference-only and is
> not built, tested, deployed or extended.

## Core principle

**Centralize SaaS plumbing, not business functionality.**

The Cyclinx Control Plane owns metadata only:

- Users & identity mapping
- Canonical Tenant Registry
- Tenant membership
- Global RBAC foundation
- Product Registry
- Product entitlements
- Tenant Resource Registry (pool / schema / dedicated DB)
- Tenant Context and resource resolution
- Tenant provisioning
- Platform audit, platform events, usage/metering foundation

Product business tables (`patients`, `doctors`, `appointments`, `lab samples`,
`inventory`, `employees`, `invoices`, ...) **never** appear in the control plane
database and are **not** queried by the control plane.

## Boundary

```
User
  |  (who is the user?)
Existing Identity Provider (OAuth2 / OIDC / JWT)
  |
Cybelinx Control Plane          <- this repository
  |  (which tenant/product can the user access, and what can they do?)
  |
  +-- Tenant Registry
  +-- User / Membership
  +-- RBAC
  +-- Product Registry
  +-- Entitlements
  +-- Tenant Resource Registry
  +-- Provisioning
  +-- Audit / Events / Usage
  |
  +---+-------------------+-------------------+
      |                   |                   |
  Jioplix           Jioplix Smart            LIMS
  Product Nexus     Product Nexus          Product Nexus   (NOT in this repo)
      |                   |                   |
  Tenant Data       Tenant Data          Tenant Data
      |                   |                   |
      +--------- Transactional Outbox -------+
                      |
                      v
              Event Worker (control plane)
                      |
                      v
              Central Event Foundation
```

## Monorepo layout

| Path | Role |
| --- | --- |
| `backend/cybelinx-shared` | Shared Java library (error model, constants, env ports) |
| `backend/central-api` | Control Plane API — Spring Boot **modular monolith** (port 3001) |
| `backend/event-worker` | Event Worker — separate Spring Boot process (port 3002) |
| `apps/admin-portal` | Admin console — Next.js App Router |
| `packages/shared` | Constants, error model, small utilities (`@cybelinx/shared`) |
| `infra/` | Docker Compose, Dockerfiles, Postgres init, scripts |
| `docs/` | PRD / TRD / architecture / API / ADRs |
| `retired/` | Pre-cutover TypeScript backend — **reference only, not built** |

Modules inside `central-api` are Spring packages (tenants, security, persistence,
health, common), not microservices. The event worker is a separate *process*,
not a separate business domain. Phase 1 remains a **modular monolith + event worker**.

## Isolation model

Tenant identity is independent of physical storage. Supported isolation modes:

- `SHARED_POOL` — shared database / shared pool
- `SCHEMA_PER_TENANT` — schema-per-tenant
- `DEDICATED_DATABASE` — dedicated database
- `DEDICATED_INFRASTRUCTURE` — future dedicated infrastructure

A product must never be coupled to the physical storage model. Tenant resources
are resolved through the Tenant Resource Registry, never through hard-coded
schema/database names.

## Technology

- **Frontend:** Next.js 16 · React 19 · TypeScript (strict)
- **Backend:** Java 21 · Spring Boot 3.5.x · Spring Web · Spring Security
- **Persistence:** Spring Data JPA · Hibernate · PostgreSQL 17 · Flyway · pgJDBC · HikariCP
- **API:** REST + JSON under `/api/v1`, OpenAPI/Swagger (`springdoc`, `/api/v1/docs`)
- **Validation:** Jakarta Bean Validation · custom `@OneOf`
- **JWT:** Nimbus (HMAC + JWKS strategies) · clock-skew aware
- **Events:** PostgreSQL transactional outbox + Spring Boot Event Worker
- **Tests:** JUnit 5 · Mockito · Spring Boot Test (MockMvc + real Postgres)
- **Build:** Maven (wrapper) · npm workspaces (frontend only)
- **Infra:** Docker Compose · GitHub Actions

No Kafka, RabbitMQ, Redis, Databricks or Snowflake in Phase 1.

## Security invariants

- Applications never use the PostgreSQL superuser (dev compose superuser is dev-only).
- Least-privilege runtime / provisioner / read-only roles (see `infra/postgres/init`).
- Tenant context must be derived from authenticated identity and authorization — never
  from a client-supplied tenant id (request bodies do not accept `tenantId`).
- Connection/transaction-scoped tenant context to prevent schema leakage across pooled
  connections (resource resolver work).
- Secrets never committed; only *credential references* are stored by the platform.
- No passwords, tokens or PHI in logs or event payloads.

## Run / verify (from repo root)

```bash
# start local postgres
npm run db:up

# frontend (admin-portal + shared): install, build, lint, typecheck, test
npm install
npm run build
npm run lint
npm run typecheck
npm test

# backend: full Maven reactor test suite (central-api + event-worker)
npm run test:backend

# run services locally
npm run dev:api      # central-api  → http://localhost:3001/api/v1
npm run dev:worker   # event-worker → http://localhost:3002/api/v1
npm run dev:portal   # admin-portal → http://localhost:3000
```