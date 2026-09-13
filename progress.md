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

## Phase: Phase 1 Gap Audit (Read-Only)

Live audit of actual source, migrations, tests, controllers, services and
repositories — the docs alone were not trusted.

### Capability status (evidence-based)

| # | Capability | Status | Notes |
| --- | --- | --- | --- |
| 1 | Documentation | COMPLETE | README/progress.java era; ARCHITECTURE.md + API.md still stale NestJS/Prisma — FIXED in capability 1 |
| 2 | Identity integration | COMPLETE | JWT verify (HMAC/JWKS) + claims + user mapping read path work; `UserMappingService.createMapping` unwired (first-sign-in auto-provision), no memberships API — hardened in capability 2 |
| 3 | Product Registry | COMPLETE | ProductsService/Controller/Repository endpoints; guarded lifecycle; audit; no business data |
| 4 | Product Versioning | COMPLETE | version catalog API + publish-current wiring `products.current_version_id` |
| 5 | Plans | COMPLETE | plan catalog API + guarded DRAFT→ACTIVE→RETIRED lifecycle + audit |
| 6 | Entitlements | COMPLETE | plan-template feature/limit catalog API + guarded state machine + audit |
| 7 | Tenant Products | COMPLETE | subscription registry API: attach/detach/products listing, plan selection, guarded status transitions (PROVISIONING→ACTIVE, ACTIVE⇄SUSPENDED, ACTIVE⇄LAPSED), audit (`tenant_product.created/status_changed/removed`) |
| 8 | Tenant Resource Registry | COMPLETE | registry API under `/tenants/{tenantId}/resources`; registration requires subscribed product (404 `TENANT_PRODUCT_NOT_FOUND` otherwise); per-env uniqueness; `productCode` view field now populated (fidelity bug fixed) |
| 9 | Resource Resolver | COMPLETE | resolver API under `/tenants/{tenantId}/products/{productId}/resolve`; ACTIVE selection, per-environment lookup, product-agnostic physical mapping (products never construct database/schema info) |
| 10 | Storage Isolation Models | PARTIALLY_IMPLEMENTED | `IsolationMode` enum (4 modes) stored on resource; no enforcement/search_path handling |
| 11 | Provisioning Engine | SCAFFOLD_ONLY | jobs/steps created inertly at tenant create (progress 10, 3 static steps); nothing executes |
| 12 | Provisioning Jobs | PARTIALLY_IMPLEMENTED | `provisioning_jobs`+`provisioning_steps` tables/entities + creation; no claim/execute/retry; no `attempt_count`/`next_retry_at`/lease cols |
| 13 | Provisioning Retry / Recovery | NOT_IMPLEMENTED | no attempt counter, no lease, no `FOR UPDATE SKIP LOCKED` |
| 14 | Transactional Outbox | SCAFFOLD_ONLY | `platform_events` table + entity; nothing writes/reads; missing `occurred_at`/`source`/`last_error`; TRD still says `outbox_events` |
| 15 | Event Worker | SCAFFOLD_ONLY | heartbeat/health only; `poll-interval-ms`/`batch-size` config dormant; no DB deps |
| 16 | Event Contract | PARTIALLY_IMPLEMENTED | envelope cols on `platform_events`; `occurred_at`/`source` missing |
| 17 | Event Idempotency | SCAFFOLD_ONLY | `event_processing` unique on `event_id` only; no `consumer_name` → per-consumer idempotency impossible |
| 18 | Retry / Backoff | NOT_IMPLEMENTED | `available_at` exists; no policy code |
| 19 | Dead Letter Handling | NOT_IMPLEMENTED | `DEAD_LETTERED` enum only; no DLQ/replay |
| 20 | Event Replay | NOT_IMPLEMENTED | nothing |
| 21 | Platform Audit | PARTIALLY_IMPLEMENTED | `audit_events` written on tenant lifecycle; write-only (no query API), no membership/product/entitlement/event-replay audits |
| 22 | Usage / Metering Foundation | SCAFFOLD_ONLY | `usage_events` table + entity (dedupe_key); nothing writes/reads |
| 23 | Product SDK | NOT_IMPLEMENTED | retired; needs new TS `@cybelinx/product-sdk` |
| 24 | Product Adapter | NOT_IMPLEMENTED | nothing |
| 25 | Tenant ID Migration Mapping | SCAFFOLD_ONLY | `tenant_external_identifiers` table + entity; no service/API |
| 26 | Admin Portal | SCAFFOLD_ONLY | single static homepage + self health route; no API client, screens, or `NEXT_PUBLIC_API_BASE_URL` use |
| 27 | Security Hardening | PARTIALLY_IMPLEMENTED | JWT validation, per-tenant service checks, DTO whitelist, CORS prop-driven, headers default; no actuator, no rate limiting, mechanism for headers; auth non-functional without IDP config |
| 28 | Integration Tests | PARTIALLY_IMPLEMENTED | 61 backend tests (tenant ITs, health, error shape, JWT, worker health); no product/plan/entitlement/outbox/provisioning ITs |
| 29 | Tenant Isolation Tests | PARTIALLY_IMPLEMENTED | `TENANT_ACCESS_DENIED` path tested in service ITs; no dedicated isolation suite / schema search_path test |
| 30 | Concurrency Tests | NOT_IMPLEMENTED | no parallel creation/provisioning/outbox tests |
| 31 | Load / Stress Tests | NOT_IMPLEMENTED | none |
| 32 | CI/CD Security and Test Improvements | PARTIALLY_IMPLEMENTED | two jobs (Maven + portal); no dependency/security scans, no Docker build, no coverage |
| 33 | Observability | NOT_IMPLEMENTED | no actuator, no request correlation_id plumbing in logs, no structured logging config |
| 34 | Migration discipline | PARTIALLY_IMPLEMENTED | Flyway V1/V2 present; no `@Version`; V3+ needed for all new columns |

### Key findings
- Only 4 controllers exist (2 health + tenants + exception handler). No product/plan/entitlement/resource/provisioning/audit/usage/event endpoints.
- 27 JPA entities + 28 tables exist; 15 repositories; no repositories for `Entitlement`, `UsageEvent`, `PlatformEvent`, `EventProcessing`, `ProductVersion`, `TenantExternalIdentifier`, `Database`, `DatabaseSchema`.
- Provisioning created inertly in `TenantsService.queueProvisioningJobs`; event-worker is a heartbeat scaffold.
- `event_processing` cannot support per-consumer idempotency (unique `event_id` only, no `consumer_name`).
- No `@Version`/optimistic locking anywhere; no `FOR UPDATE SKIP LOCKED` usage.
- Admin portal has no API client and never uses `NEXT_PUBLIC_API_BASE_URL`; `Dockerfile.admin-portal` references retired paths (broken `npm ci`).
- `TenantsService.toResourceView` hard-codes `productCode` as `""` — FIXED in capability 8 (product code from `tenant_resources.product_id`).
- No actuator anywhere; `spring-boot-starter-actuator`/testcontainers absent.

## Phase: Phase 1 Gap Fixing

### Capability 1 — Documentation correction [COMPLETE]
- [x] `docs/architecture/ARCHITECTURE.md` rewritten for Java 21 / Spring Boot (layout, modules, technology, isolation, run/verify); authoritative backend statement added
- [x] `docs/api/API.md` corrected (Spring Boot ownership, actual tenant endpoints, error envelopes, authn/JWT validation, conventions)
- [x] `docs/README.md` indexes TRD v1.2 Java/Spring and marks v1.1 as the NestJS baseline
- [x] Root `README.md` carries the authoritative statement (Java/Spring current; `retired/` reference-only)
- [x] Full test suite still green after doc changes (central-api 61/61 pre-capability-2)

### Capability 2 — Identity integration hardening [COMPLETE]
- [x] Provider-agnostic abstraction introduced in `security/identity/`: `IdentityProvider`, `IdentityClaims`, `IdentityToken`, `IdentityVerificationException`, `JwtIdentityProvider`
- [x] `IdentityService` now delegates verification to `IdentityProvider` (JWT HMAC/JWKS adapter), keeps exact 401 `Invalid access token: <REASON>` wire shape
- [x] First-sign-in auto-provisioning wired: `UserMappingService.resolveUser` looks up then upserts (user + user_identity) on miss
- [x] Lost-update race safety: create runs in `REQUIRES_NEW` with `DataIntegrityViolationException` fallback to re-read the winner's mapping (unique `identity_provider`+`external_subject`)
- [x] Fixed shadowed-timestamp bug: `UserIdentity#prePersist` suppressed the `BaseTimestampedEntity` callback → `created_at`/`updated_at` NOT NULL violations on insert; now self-sufficient
- [x] `IdentitySecurityConfig` exposes the JWT `IdentityProvider` bean; `identityProvider`/`identityService` beans decoupled
- [x] Tests: `IdentityServiceTest` (6 unit: delegation, 401s, provisioning, metadata) + `UserMappingServiceIT` (5 IT: provision, synthetic email, reuse, distinct subjects, not-found) — 63/63 central-api + 9 event-worker = 72/72

### Capability 3 — Product Registry [COMPLETE]
- [x] Registry API under `/api/v1/products` (context-path `/api/v1`): `POST` create (default `DRAFT`) · `GET` list (page/limit, `status` filter, `search`, `sort` on `createdAt|name|productCode`) · `GET :productId` · `PUT :productId` · `PATCH :productId/status`
- [x] Unique `product_code` enforced as 409 `PRODUCT_CODE_TAKEN` (pre-check + DB unique constraint); unknown product → 404 `PRODUCT_NOT_FOUND`
- [x] Guarded lifecycle (`ProductTransitions`): `DRAFT → ACTIVE → DEPRECATED → DISABLED` (+ `ACTIVE → DISABLED`); `DISABLED` terminal; invalid transitions → 409 `PRODUCT_STATUS_TRANSITION_INVALID`
- [x] `ProductRepository` now `JpaSpecificationExecutor` for filtered/paginated list; no new DB tables — reuses V1 `products`/`audit_events`
- [x] Permissions `product:read`/`product:write` (`ProductConstants`); `@RequirePermissions` on routes + `assertPlatformPermission` in service (platform-admin override path kept); interceptor registered on `/products/**` alongside `/tenants/**`
- [x] Shared ErrorCodes added: `PRODUCT_CODE_TAKEN`, `PRODUCT_STATUS_TRANSITION_INVALID` (both 409 in `defaultHttpStatus`)
- [x] Audit trail: `product.created` / `product.updated` (changed fields) / `product.status_changed` (from→to metadata) — `entityType="product"`, product FK, no tenant
- [x] Tests: `ProductTransitionsTest` (6 unit) + `ProductsServiceIT` (11 IT: create+audit, permission grant, duplicate 409, forbidden, list paginate/filter, get + detail, 404, update+audit, full lifecycle falls, invalid transition, terminal) — central-api 80/80 + event-worker 9 = **89/89 backend green**

### Capability 4 — Product Versioning [COMPLETE]
- [x] Version catalog API nested under a product: `POST /products/{productId}/versions` (semver-like `version` `^\d{1,3}(\.\d{1,3}){1,2}$`, optional `releaseNotes`) · `GET /products/{productId}/versions` (oldest-first) · `GET .../versions/{versionId}` · `PUT .../versions/{versionId}/publish`
- [x] Publish swaps `current`: previous current version(s) cleared (`is_current=false`), target set `is_current=true` + `published_at`, and `products.current_version_id` wired to the new version — one transaction
- [x] New `ProductVersionRepository` (findByProductIdAndVersion, findByIdAndProductId, current-per-product, order-by-created); no DB migration — reuses V1 `product_versions`
- [x] Shared ErrorCodes: `PRODUCT_VERSION_NOT_FOUND` (404), `PRODUCT_VERSION_TAKEN` (409)
- [x] Audit: `product_version.created` / `product_version.published` (`entityType="product_version"`, product FK, metadata = version string)
- [x] `@RequirePermissions` (`product:read`/`product:write`) + service `assertPlatformPermission` (platform-admin override)
- [x] Tests: `ProductVersionsServiceIT` (9 IT: create+audit, duplicate 409, unknown product/version 404, forbidden, oldest-first list, get, publish swap + product wiring + current flip + audit) — central-api 89/89 + event-worker 9 = **98/98 backend green**

### Capability 5 — Plans [COMPLETE]
- [x] Plan catalog API nested under a product: `POST /products/{productId}/plans` (`planCode` `^[A-Z][A-Z0-9_]{1,63}$`, optional `description`/`trialDays` ≤730) · `GET /products/{productId}/plans?status` · `GET .../plans/{planId}` · `PUT .../plans/{planId}` (name/description/trialDays) · `PATCH .../plans/{planId}/status`
- [x] Guarded plan lifecycle (`PlanTransitions`): `DRAFT → ACTIVE → RETIRED`; `RETIRED` terminal; invalid → 409 `PLAN_STATUS_TRANSITION_INVALID`
- [x] Duplicate `plan_code` under a product pre-checked → 409 `PLAN_CODE_TAKEN` (DB unique `plans_product_code_unique` as backstop); `requirePlan` scoped to product → 404 `PLAN_NOT_FOUND`
- [x] New `PlanRepository` (`findByProductIdAndPlanCode`, `findByIdAndProductId`, list by status/created-at, and `findFirstByProductIdAndStatusOrderByCreatedAtAsc` the TenantsService active-plan lookup depends on — retained); no DB migration — reuses V1 `plans`
- [x] Audit: `plan.created` / `plan.updated` (fields) / `plan.status_changed` (from→to), `entityType="plan"`, product FK
- [x] `@RequirePermissions` (`product:read`/`product:write`) + service `assertPlatformPermission`
- [x] Tests: `PlanTransitionsTest` (5 unit) + `PlansServiceIT` (11 IT: create+audit, duplicate 409, unknown product/plan 404, forbidden, status-filtered list, get, update+audit, lifecycle, invalid transition, terminal) — central-api 105/105 + event-worker 9 = **114/114 backend green**

### Capability 6 — Entitlements [COMPLETE]
- [x] Entitlement catalog API nested under a plan: `POST /products/{productId}/plans/{planId}/entitlements` (`key` `^[a-z][a-z0-9_.:-]{1,127}$`, structured JSON `value` object) · `GET .../entitlements` · `GET .../entitlements/{entitlementId}` · `PUT .../entitlements/{entitlementId}` (name/value) · `PATCH .../entitlements/{entitlementId}/status`
- [x] Guarded state machine (`EntitlementTransitions`): `PENDING → ACTIVE`; `ACTIVE ⇄ SUSPENDED`; `ACTIVE ⇄ INACTIVE`; invalid → 409 `ENTITLEMENT_STATUS_TRANSITION_INVALID`
- [x] Duplicate `key` per plan pre-checked → 409 `ENTITLEMENT_KEY_TAKEN` (DB unique `entitlements_plan_key_unique`); scoped lookup → 404 `ENTITLEMENT_NOT_FOUND`/`PLAN_NOT_FOUND`
- [x] `Entitlement.value` (jsonb `Map<String,Object>`) round-trips through Jackson at the JPA layer; `@JdbcTypeCode(SqlTypes.JSON)` already on entity — no DB migration, reuses V1 `entitlements`
- [x] New `EntitlementRepository` (`findByPlanIdAndKey`, `findByIdAndPlanId`, list by created-at)
- [x] Audit: `entitlement.created` / `entitlement.updated` (fields) / `entitlement.status_changed` (from→to, planId in metadata), `entityType="entitlement"`, product FK
- [x] Tests: `EntitlementTransitionsTest` (6 unit) + `EntitlementsServiceIT` (10 IT: create+audit with JSON value, duplicate key 409, unknown plan/entitlement 404, forbidden, list, get, update+audit, full state machine, invalid transition) — central-api 121/121 + event-worker 9 = **130/130 backend green**

### Capability 7 — Tenant Products [COMPLETE]
- [x] Subscription registry API nested under a tenant: `GET /tenants/{tenantId}/products` (list) · `POST /tenants/{tenantId}/products` (attach; `productCode` required, `planCode` optional → default active plan) · `PATCH .../products/{productId}/status` · `DELETE .../products/{productId}` (soft detach → `DISABLED`)
- [x] Attach requires product `ACTIVE` (else 409 `PRODUCT_NOT_ACTIVE`) and plan `ACTIVE` (else 409 `PLAN_NOT_ACTIVE`); duplicate attach pre-checked → 409 `TENANT_PRODUCT_ALREADY_ASSIGNED` (DB unique `tenant_products_tenant_product_unique` as backstop); unattached → 404 `TENANT_PRODUCT_NOT_FOUND`
- [x] Guarded subscription state machine (`TenantProductTransitions`): `PROVISIONING → ACTIVE`; `ACTIVE ⇄ SUSPENDED`; `ACTIVE ⇄ LAPSED`; `DISABLED` terminal; invalid → 409 `TENANT_PRODUCT_STATUS_TRANSITION_INVALID`
- [x] Attach sets `ACTIVE` + `activated_at=now`; re-activation refreshes `activated_at`; detach is soft (status `DISABLED`)
- [x] `TenantProductRepository.findByTenantIdAndProductId` added; service reuses `listByTenantId` (join-fetched product+plan) and the `findFirstByProductIdAndStatusOrderByCreatedAtAsc` default-plan lookup
- [x] Tenant-scope guard (`assertCanManageTenant`): platform-admin override, else `tenant:read`/`tenant:write` membership permission, else 403 `TENANT_ACCESS_DENIED`; `requireTenant` treats `DELETED` as 404 `TENANT_NOT_FOUND` (never trusts the client `tenant_id`)
- [x] Audit: `tenant_product.created` / `tenant_product.status_changed` (from→to) / `tenant_product.removed` — `entityType="tenant_product"`, tenant + product FKs
- [x] Shared ErrorCodes: `TENANT_PRODUCT_NOT_FOUND` (404); `TENANT_PRODUCT_ALREADY_ASSIGNED`, `TENANT_PRODUCT_STATUS_TRANSITION_INVALID`, `PRODUCT_NOT_ACTIVE`, `PLAN_NOT_ACTIVE` (409)
- [x] Tests: `TenantProductsServiceIT` (14 IT: attach+audit, default plan selection, duplicate 409, unknown product 404, inactive product 409, retired plan 409, unknown plan 404, missing permission 403, operator with tenant:write succeeds, list, status transitions+audit, invalid transition 409, detach→DISABLED→terminal, unattached 404) — central-api 135/135 + event-worker 9 = **144/144 backend green**

### Capability 8 — Tenant Resource Registry [COMPLETE]
- [x] Registry API nested under a tenant: `GET /tenants/{tenantId}/resources` · `GET .../resources/{resourceId}` · `POST .../resources` (register; `productCode` + `resourceTypeCode`, optional `isolationMode`/`environment` with defaults `SHARED_POOL`/`DEVELOPMENT`) · `PATCH .../resources/{resourceId}` (schemaName/migrationVersion/credentialReference) · `DELETE .../resources/{resourceId}` (soft detach → status `RETIRED`, provisioning `ROLLED_BACK`)
- [x] Register requires the tenant is subscribed to the product (else 404 `TENANT_PRODUCT_NOT_FOUND` / `PRODUCT_NOT_FOUND`) and the resource type exists in the catalog (404 `RESOURCE_NOT_FOUND`); new resources start `PROVISIONING` / `IN_PROGRESS` (execution owned by provisioning capability, 11–13)
- [x] Per-environment uniqueness `(tenant, product, environment, resource)` pre-checked → 409 `TENANT_RESOURCE_ALREADY_REGISTERED` (DB unique `tenant_resources_tenant_product_env_resource_unique` as backstop); scoped lookup → 404 `TENANT_RESOURCE_NOT_FOUND`
- [x] `TenantResourceRepository` gained `findByIdAndTenantId` (join-fetch product+resource) + `existsByTenantIdAndProductIdAndEnvironmentAndResourceId`; list query now join-fetches product too
- [x] Fidelity fix: `TenantsService.toResourceView` populates `productCode` from `tenant_resources.product_id` instead of hard-coded `""`
- [x] Tenant-scope guard (`assertCanManageTenant`): platform-admin override, else `tenant:read`/`tenant:write`, else 403 `TENANT_ACCESS_DENIED`; `requireTenant` treats `DELETED` as 404
- [x] Audit: `tenant_resource.created` / `tenant_resource.updated` (changed fields only) / `tenant_resource.removed` — `entityType="tenant_resource"`, tenant + product FKs
- [x] Shared ErrorCodes: `TENANT_RESOURCE_NOT_FOUND` (404), `TENANT_RESOURCE_ALREADY_REGISTERED` (409)
- [x] Tests: `TenantResourcesServiceIT` (15 IT: register+audit+defaults, custom isolation/environment, duplicate 409, per-environment distinct ok, unknown product 404, not-subscribed 404, unknown resource type 404, missing permission 403, operator with tenant:write succeeds, list with productCode, get detail, unknown resource 404, update+audit, no-change skip audit, remove→RETIRED+ROLLED_BACK+audit) — central-api 150/150 + event-worker 9 = **159/159 backend green**

### Capability 9 — Resource Resolver [COMPLETE]
- [x] Resolver API: `GET /tenants/{tenantId}/products/{productId}/resolve?environment=DEVELOPMENT` — input `(tenant, product, environment)`, output physical mapping `(resourceId, resourceTypeCode, isolationMode, databaseName, schemaName, regionCode, credentialReference, status)`; products never construct database/schema info themselves (platform-owned resolution per TRD §30 / PRD §16)
- [x] `TenantResourceResolver` interface + `DefaultTenantResourceResolver`: picks the `ACTIVE` resource for the environment (latest-first via `TenantResourceRepository.resolveFor`, join-fetching database/schema/region); no resource or only `RETIRED` → 404 `RESOURCE_NOT_FOUND`; exists but not ready (e.g. `PROVISIONING`/`FAILED`) → 503 `RESOURCE_NOT_READY` with `status` + `provisioningState` details
- [x] `TenantResourcesService.resolveResource` facade: `requireTenant` (DELETED → 404) + `assertCanManageTenant` (`tenant:read`, platform-admin override) + product exists check (`404 PRODUCT_NOT_FOUND`) then delegates to the resolver
- [x] No new tables — reuses V1 `tenant_resources` + `databases` + `regions` + `schemas`; `resolveFor` query added to the repository
- [x] Tests: `TenantResourceResolverIT` (9 IT: active metadata incl. database+schema+region+credential, environment default, no resource 404, provisioning → RESOURCE_NOT_READY, retired-only 404, environment mismatch 404, unknown product 404, missing permission 403, picks ACTIVE over PROVISIONING) — central-api 159/159 + event-worker 9 = **168/168 backend green**
