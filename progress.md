# Cybelinx Platform — Progress Tracking

## Phase: Monorepo Scaffold (Foundation)

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

### Environment
- [x] Node v24.16.0, npm 11.13.0, Docker 29.2.1 + Compose v5.0.2, git 2.49.0
- [x] Resolved dependency version pins (TS 5.9, ESLint 9, Nest 11, Next 16, Prisma 6, Jest 29, zod 4)

### Scaffold checklist
- [x] Root workspace configuration (package.json, tsconfig.base, eslint, prettier, .gitignore, .env.example, README)
- [x] packages/: shared, types, config, auth, tenant-context, event-contracts, product-sdk
- [x] apps/central-api (NestJS modular monolith + health endpoints + Prisma)
- [x] apps/event-worker (separate deployable process + health endpoints)
- [x] apps/admin-portal (Next.js App Router)
- [x] infra/ (docker-compose, Dockerfiles, postgres init scripts, scripts)
- [x] docs/ (architecture, api, adr)
- [x] .github/workflows/ci.yml
- [x] npm install + lockfile
- [x] Build all workspaces (topological order)
- [x] Lint / typecheck / tests green

### Key decisions
- npm workspaces monorepo (`apps/*`, `packages/*`), packages compiled to `dist/` with `tsc`
- `central-api` = modular monolith; `event-worker` = separate deployable process; no extra microservices
- Local PostgreSQL via Docker Compose (`infra/docker/docker-compose.yml`)
- Prisma 6 pinned (latest 7.x deferred for compatibility with @nestjs/terminus health indicators)
- TypeScript 5.9 / ESLint 9 (TS 7 / ESLint 10 deferred for ecosystem compatibility)
- Nest 11 pinned (`@nestjs/*` ^11.x, `@nestjs/config` ^4.0.4) — Nest 12 is ESM-only, incompatible with Jest 29
- Admin portal linted with its own Next flat config; root flat config covers packages + Nest apps

## Phase: Control-Plane Database Schema (Metadata Only)

### Checklist
- [x] Prisma schema for all platform domains (`apps/central-api/prisma/schema.prisma`)
- [x] Enums incl. `IsolationMode` (SHARED_POOL / SCHEMA_PER_TENANT / DEDICATED_DATABASE / DEDICATED_INFRASTRUCTURE)
- [x] UUID platform identifiers + canonical `Tenant.id` as the single `tenant_id`
- [x] Product-specific tenant ids only as external references (`tenant_external_identifiers`)
- [x] Credentials stored as references only (`credential_reference`), never secrets
- [x] Indexes + named unique constraints on all key columns
- [x] `packages/types` enums aligned with DB enums + tests updated
- [x] Idempotent development seed (`apps/central-api/prisma/seed.ts`): regions, resource catalog, roles/permissions, notifications, 5 products + versions/plans/entitlements, 1 dev test tenant (`ACME`)
- [x] Migration generated + applied (`20260911102306_init_platform_schema`)
- [x] Seed executed and re-run idempotently
- [x] `prisma validate` + build / lint / typecheck / tests green (33 tests)

### Notes
- Local dev DB: PostgreSQL on `localhost:5432` (`cybelinx_platform`, owner `cybelinx`). Docker Compose remains the portable option (`npm run db:up`) but was bypassed because the Docker daemon was unavailable and a native Postgres already listens on 5432.
- Platform DB is metadata ONLY — no business/PHI tables for Jioplix, LIMS, StoreAI or SynthalystHRM.

### Key decisions
- `Package.json#prisma.seed` is deprecated in Prisma 7; migration to `prisma.config.ts` deferred (tracked for the Prisma 7 upgrade).

## Phase: Identity Integration (Identity Provider Adapter)

### Checklist
- [x] `IdentityProviderAdapter` abstraction (validateToken / getUserIdentity / mapExternalUser / createUserMapping / getProviderMetadata)
- [x] Replaceable provider — `IDP_PROVIDER=generic` default; no hardcoded Supabase/Auth0/Clerk; swap via adapter + env
- [x] JWT validation abstraction (`JwtVerifier` + `TokenSignatureVerifier` strategies: HMAC, JWKS/RSA, unconfigured)
  - [x] issuer · audience · signature · expiration · not-before · subject validation
- [x] User/UserIdentity mapping (`UserMappingService`, idempotent, synthetic email fallback, no secrets stored)
- [x] Separation of concerns: IdP answers "who" (`IdentityService.resolvePrincipal`); platform answers "what access" (`AuthorizationService` from memberships/roles/permissions) — no tenant authz inside the adapter
- [x] Separate `AuthenticationGuard` (identity) and `AuthorizationGuard` (permissions via `@RequirePermissions`)
- [x] Guard/decorator plumbing: `@RequirePermissions`, `@CurrentPrincipal`
- [x] Env additions: `IDP_PROVIDER`, `IDP_JWT_SECRET`, `IDP_JWKS_URI`, `IDP_JWT_CLOCK_SKEW_SECONDS` (+ `packages/config` schema + `.env.example`)
- [x] Unit tests: valid, expired, invalid issuer, invalid audience, missing subject, unknown user, mapped user, signature tamper, nbf, clock skew, algorithm mismatch, guard 401/403 paths
- [x] `npm run check` green (all workspaces); `prisma validate` OK; `validate:env` OK

### Notes
- No business APIs yet. Guards are exported from `IdentityModule` for future route wiring; health endpoints remain public.
- Authn/authz guard split: authentication asserts identity only; authorization resolves RBAC from the DB (active memberships → role codes → permission codes, platform-admin override).

## Phase: Tenant Management (Registry + Lifecycle)

### Checklist
- [x] Tenant lifecycle enum replaced: `ACTIVE | SUSPENDED | PROVISIONING | DEACTIVATED | DELETION_PENDING | DELETED` (dropped PROSPECT/DEACTIVATING/ARCHIVED; default → PROVISIONING) in schema, `packages/types` + tests
- [x] Migration applied (`20260911120000_tenant_lifecycle_statuses`, hand-written SQL for enum rotation), client regenerated, seed re-run idempotently
- [x] REST API under `/api/v1/tenants`: `POST` create · `GET` list (pagination `page`/`limit`, `status` filter, `search`, `sort`) · `GET :tenantId` · `PATCH :tenantId` · `POST :tenantId/suspend` · `POST :tenantId/activate` · `DELETE :tenantId` (deferred deletion → DELETION_PENDING)
- [x] Transactional 8-step tenant creation: validate caller permission → canonical tenant → initial membership (creator joins) → platform-admin role grant → requested product relationships → provisioning jobs when resources requested → audit event → tenant context response
- [x] Final tenant status derived: `ACTIVE` when no resource provisioning needed, else `PROVISIONING`
- [x] Soft/deferred deletion lifecycle: `markDeletionPending` (DELETION_PENDING) and `finalizeDeletion` (DELETED) — rows are retained, DELETED tenants are treated as not found
- [x] Status transition guards via `applyTransition` (invalid transitions → 409 `TENANT_STATUS_TRANSITION_INVALID`)
- [x] Defense in depth: `@RequirePermissions` at route level AND tenant-scoped checks in the service (`AuthorizationService.listAccess`); target tenant comes only from the route param and `tenantId` in the request body is rejected (whitelist) — never trusted
- [x] `@cybelinx/shared` ErrorCodes added: `TENANT_CODE_TAKEN`, `TENANT_STATUS_TRANSITION_INVALID`, `PRODUCT_NOT_FOUND`, `PLAN_NOT_FOUND`, `REGION_NOT_FOUND`; new global `ApiErrorFilter` (APP_FILTER) maps codes → HTTP statuses
- [x] Repository layer (`TenantsRepository`) with transaction-capable client (`PrismaClient | Prisma.TransactionClient`), named unique constraints respected (`plans_product_code_unique`, `tenant_memberships_tenant_user_unique`, …)
- [x] `@cybelinx/types` package dependency added to central-api; `packages/types` also adds `ENVIRONMENTS`/`Environment`
- [x] Tests (29 new, all without DB): service create (full flow incl. provisioning job + PROVISIONING status), duplicate code rollback, unknown product/plan/region, missing permission, tenant-scope authorize/deny incl. platform-admin override and DELETED-as-not-found, suspend/activate, soft-delete lifecycle, update+audit, list pagination/filter/sort; controller e2e: DTO validation, forbidNonWhitelisted (`tenantId` body), UUID param, ApiError→HTTP mapping, suspend delegation
- [x] Verified: `npm run check` green (all workspaces), central-api 67/67 tests, `prisma validate` OK, `validate:env` OK
- [x] No product business data created — only relationship rows (TenantProduct/TenantResource/ProvisioningJob/ProvisioningStep) + metadata + audit

### Notes
- `DELETE /tenants/:tenantId` implements the deferred-deletion request (status → DELETION_PENDING). Finalization to DELETED is a service method (`finalizeDeletion`) ready for a worker/cleanup job.
- `resolveProducts` explicitly does NOT touch product databases; it writes only platform subscription/workspace metadata.

## Phase: Java Backend Cutover (Spring Boot · Big Bang)

The Node/NestJS/Prisma control plane was ported 1:1 to Java 21 + Spring Boot 3.5.9
(parallel build) and cut over in one move. The pre-cutover TypeScript sources are
preserved in `retired/` (not part of the monorepo).

### Checklist
- [x] Maven multi-module backend: `backend/pom.xml` + `cybelinx-shared`, `central-api`, `event-worker` modules (Maven wrapper 3.9.16)
- [x] Flyway migrations `V1__init_platform_schema.sql` (schema port, metadata-only) + `V2__lowercase_enum_types.sql` (17 PG enum types renamed to lowercase for Hibernate named-enum casts); `ddl-auto: validate`
- [x] Spring Security permissive chain + `TenantAuthInterceptor` (port of AuthenticationGuard + AuthorizationGuard, `/tenants/**`) + `@CurrentPrincipal` + `@RequirePermissions`
- [x] JWT verification (Nimbus 9.48): exact algorithm match → signature → sub/iss/aud/exp/nbf with clock skew; `JwtReason` matches TS union
- [x] `TenantsService` + `TenantsController`: transactional 8-step create, guarded status transitions, soft deletion, audit (`AuditEvent.metadata` as JSON), search/filter/paginate
- [x] Nest-shaped error responses: `ApiError` + `ApiHttpException` (`{statusCode,error,message}`), 500 → `{statusCode,message}`
- [x] Two Hibernate gotchas fixed: bulk `@Modifying` needed `flushAutomatically` (dirty status was being discarded), and JSON mapped to `Object` fields casts failure → JSON metadata stored as `String` with Jackson mapper
- [x] Event-worker parity: `WorkerState` + `HeartbeatService` (30s daemon), `/health` + `/health/live` + `/health/ready` terminus shapes, no DB stack
- [x] Backend tests green: `.\mvnw.cmd test` = **61/61** (central-api 52, event-worker 9)
- [x] Live boot verified: central-api port 3001 (`/api/v1/docs`), event-worker port 3002 (`/health/ready` → RUNNING heartbeat)
- [x] Cutover: retired `apps/central-api`, `apps/event-worker` and TS backend packages (`types`, `config`, `auth`, `tenant-context`, `event-contracts`, `product-sdk`) → `retired/ts-backend`, `retired/ts-packages`
- [x] Monorepo trimmed: npm workspaces = `apps/admin-portal` + `packages/shared`; root scripts updated (`test:backend`, `dev:api`, `dev:worker` → Maven; `prisma:generate`/`validate:env` removed)
- [x] Infra updated: Dockerfiles for central-api/event-worker → multi-stage Java 21 build via Maven wrapper; CI split into `java-backend` (Postgres service + Maven test) + `admin-portal` jobs; `.env.example` uses `SPRING_DATASOURCE_*`
- [x] README + this file reflect the Java backend

### Notes
- Java-backend env vars differ from the TS era: datasource is `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` (DB credentials unchanged).
- `retired/` keeps the full TS backend + packages for reference; it is excluded from workspaces, lint, CI and Docker builds.
