# Architecture

> The canonical architecture lives in the
> [PRD](../Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md) and
> [TRD](../Cybelinx_Phase1_TRD_v1.1_Updated.md). This document captures the
> *implemented scaffold* and the boundaries it enforces.

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
Identity Provider
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
  +-----------------------------+
  |                             |
Jioplix                     Jioplix Smart
Product Nexus               Product Nexus          (NOT in this repo)
  |                             |
Tenant Data                 Tenant Data
  |                             |
Outbox                       Outbox
  +-------------+---------------+
                |
          Event / Messaging
```

## Monorepo layout

| Path | Role |
| --- | --- |
| `apps/central-api` | Control Plane API — NestJS **modular monolith** (single deployable) |
| `apps/event-worker` | Event Worker — separate deployable process |
| `apps/admin-portal` | Admin console — Next.js App Router |
| `packages/shared` | Constants, error model, small utilities (`@cybelinx/shared`) |
| `packages/types` | Canonical platform domain types (`@cybelinx/types`) |
| `packages/config` | Environment schema, validation, defaults (`@cybelinx/config`) |
| `packages/auth` | Identity / JWT claim model (`@cybelinx/auth`) |
| `packages/tenant-context` | Tenant context model & guards (`@cybelinx/tenant-context`) |
| `packages/event-contracts` | Standard event contract & validation (`@cybelinx/event-contracts`) |
| `packages/product-sdk` | Future product integration SDK (`@cybelinx/product-sdk`) |
| `infra/` | Docker Compose, Dockerfiles, Postgres init, scripts |
| `docs/` | PRD / TRD / architecture / API / ADRs |

Modules inside `central-api` are Nest modules (health, prisma), not microservices.
The event worker is a separate *process*, not a separate business domain.

## Isolation model

Tenant identity is independent of physical storage. Supported isolation modes
(arriving with the resource registry work):

- `POOL` — shared database / shared pool
- `SCHEMA` — schema-per-tenant
- `DEDICATED_DB` — dedicated database
- `DEDICATED_INFRA` — future dedicated infrastructure

A product must never be coupled to the physical storage model.

## Technology

- **Frontend:** Next.js 16 · React 19 · TypeScript (strict)
- **Backend:** NestJS 11 · Node.js 24 · TypeScript (strict)
- **API:** REST + JSON under `/api/v1`, OpenAPI/Swagger
- **ORM:** Prisma 6 · **Database:** PostgreSQL 17
- **Events:** PostgreSQL transactional outbox + lightweight worker (future phases)
- **Tests:** Jest 29 · Supertest · (Playwright later)
- **Quality:** TypeScript strict · ESLint 9 flat config · Prettier · `typescript-eslint`
- **Infra:** Docker Compose · GitHub Actions

No Kafka, RabbitMQ, Redis, Databricks or Snowflake in Phase 1.

## Security invariants

- Applications never use the PostgreSQL superuser (dev compose superuser is dev-only).
- Least-privilege runtime / provisioner / read-only roles (see `infra/postgres/init`).
- Tenant context must be derived from authenticated identity and authorization — never
  from a client-supplied tenant id.
- Connection/transaction-scoped tenant context to prevent schema leakage across pooled
  connections (implemented with the resource resolver work).
- Secrets never committed; only *credential references* are stored by the platform.
- No passwords, tokens or PHI in logs or event payloads.

## Run / verify (from repo root)

```bash
# start local postgres
npm run db:up

# install, build, lint, typecheck, test
npm install
npm run build
npm run lint
npm run typecheck
npm test