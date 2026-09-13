# API Reference

All Control Plane endpoints are namespaced under **`/api/v1`** and served by
`backend/central-api` (Spring Boot). The Admin Portal and products must never touch
the platform database directly.

Interactive OpenAPI/Swagger docs: `GET /api/v1/docs` (when the API is running).

## Health endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Service metadata (no dependencies) |
| `GET` | `/api/v1/health/live` | Liveness check |
| `GET` | `/api/v1/health/ready` | Readiness — checks required dependencies (DB for the API, worker state for the event worker) |

`/health/live` and `/health/ready` return a Terminus-compatible envelope: HTTP
`200` when up, `503` when a dependency is down.

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

The event worker exposes the same endpoints on its own port (`WORKER_PORT`,
default `3002`). Its readiness reflects worker state rather than the database.

## Authentication

The Control Plane does not authenticate users itself; the existing Identity
Provider issues the tokens. Protected endpoints accept `Authorization: Bearer <JWT>`.

JWT validation checks, in order:

1. Well-formed (3 segments, base64url payload)
2. Exact signing algorithm match against the configured issuer strategy
3. Signature verification (HMAC secret or JWKS/RSA — configured via `IDP_JWT_SECRET` / `IDP_JWKS_URI`)
4. Claims: `sub` (required), `iss` (when configured), `aud` (when configured), `exp`, `nbf` (with `IDP_JWT_CLOCK_SKEW_SECONDS`)

Identities are mapped to platform `users` via `(provider, subject)`. Tenant context
is derived from authenticated identity + active membership + authorization — never
from a client-supplied `tenant_id`.

## Tenants

Base `/api/v1/tenants` — all endpoints require the bearer token and the listed
permission (`tenant:read` / `tenant:write`).

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/tenants` | `tenant:write` | Create tenant (8-step transactional flow, deterministic status) |
| `GET` | `/api/v1/tenants?page&limit&status&search&sort` | `tenant:read` | Paginated list |
| `GET` | `/api/v1/tenants/{tenantId}` | `tenant:read` | Tenant detail (memberships, products, resources, jobs) |
| `PATCH` | `/api/v1/tenants/{tenantId}` | `tenant:write` | Partial update (name/region/country/timezone) |
| `POST` | `/api/v1/tenants/{tenantId}/suspend` | `tenant:write` | Suspend (`ACTIVE` → `SUSPENDED`) |
| `POST` | `/api/v1/tenants/{tenantId}/activate` | `tenant:write` | Activate (`SUSPENDED` → `ACTIVE`) |
| `DELETE` | `/api/v1/tenants/{tenantId}` | `tenant:write` | Deferred deletion request (`DELETION_PENDING`) |

Tenant status transitions are guarded: `suspend` only from `ACTIVE`; `activate`
only from `SUSPENDED`; deletion request from `PROVISIONING`/`ACTIVE`/`SUSPENDED`/
`DEACTIVATED`. Invalid transitions → `409 TENANT_STATUS_TRANSITION_INVALID`.

## Tenant products

Base `/api/v1/tenants/{tenantId}/products` — the tenant's subscribed products
(subscription registry). Products must be `ACTIVE` and the selected plan must be
`ACTIVE` to attach.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tenants/{tenantId}/products` | `tenant:read` | List the tenant's subscribed products |
| `POST` | `/api/v1/tenants/{tenantId}/products` | `tenant:write` | Attach a product (`{ "productCode": "BILLING", "planCode": "PRO" }`; `planCode` optional → default active plan) |
| `PATCH` | `/api/v1/tenants/{tenantId}/products/{productId}/status` | `tenant:write` | Status change (`{ "status": "SUSPENDED" }` / `"ACTIVE"`) |
| `DELETE` | `/api/v1/tenants/{tenantId}/products/{productId}` | `tenant:write` | Detach (soft — status → `DISABLED`) |

Subscription state is guarded: `PROVISIONING → ACTIVE`; `ACTIVE ⇄ SUSPENDED`; `ACTIVE
⇄ LAPSED`; `DISABLED` is terminal. Invalid transitions → `409
TENANT_PRODUCT_STATUS_TRANSITION_INVALID`; duplicate attach → `409
TENANT_PRODUCT_ALREADY_ASSIGNED`; unattached product → `404
TENANT_PRODUCT_NOT_FOUND`; non-purchasable product → `409 PRODUCT_NOT_ACTIVE`;
non-purchasable plan → `409 PLAN_NOT_ACTIVE`.

## Tenant resources

Base `/api/v1/tenants/{tenantId}/resources` — the tenant resource registry.
Resources are registered against a product the tenant is subscribed to and a
catalog resource type; starting state is `PROVISIONING`/`IN_PROGRESS` (executed
by the provisioning pipeline).

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tenants/{tenantId}/resources` | `tenant:read` | List registered resources |
| `GET` | `/api/v1/tenants/{tenantId}/resources/{resourceId}` | `tenant:read` | Resource detail |
| `POST` | `/api/v1/tenants/{tenantId}/resources` | `tenant:write` | Register (`{ "productCode": "JIOPLIX", "resourceTypeCode": "shared_pg_instance", "isolationMode": "SCHEMA_PER_TENANT", "environment": "PRODUCTION" }`; isolation/environment optional) |
| `PATCH` | `/api/v1/tenants/{tenantId}/resources/{resourceId}` | `tenant:write` | Update `schemaName`/`migrationVersion`/`credentialReference` |
| `DELETE` | `/api/v1/tenants/{tenantId}/resources/{resourceId}` | `tenant:write` | Detach (soft — status → `RETIRED`, provisioning `ROLLED_BACK`) |

Registration requires the tenant is already subscribed to the product (`404
TENANT_PRODUCT_NOT_FOUND` / `PRODUCT_NOT_FOUND`), and the resource type is in
the catalog (`404 RESOURCE_NOT_FOUND`). Duplicate registration for the same
`(product, environment, resource)` → `409 TENANT_RESOURCE_ALREADY_REGISTERED`;
unregistered resource → `404 TENANT_RESOURCE_NOT_FOUND`.

## Resource resolver

Base `/api/v1/tenants/{tenantId}/products/{productId}/resolve` — resolves the
concrete physical resources backing a subscribed product for an environment.
Products never construct database/schema info themselves; the platform owns
resolution from the resource registry.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tenants/{tenantId}/products/{productId}/resolve?environment=DEVELOPMENT` | `tenant:read` | Resolve the `ACTIVE` resource for the environment |

`environment` defaults to `DEVELOPMENT` (`DEVELOPMENT`/`STAGING`/`PRODUCTION`).

Response (the `ACTIVE` resource, latest registered first):

```json
{
  "resourceId": "…",
  "resourceTypeCode": "shared_pg_instance",
  "isolationMode": "SCHEMA_PER_TENANT",
  "databaseName": "cyb_db_acme",
  "schemaName": "cyb_schema_acme",
  "regionCode": "AP-SOUTH-1",
  "credentialReference": "vault/cyb/acme",
  "status": "ACTIVE"
}
```

No registered resource for the (tenant, product, environment) → `404
RESOURCE_NOT_FOUND`; registered but not yet usable (e.g. `PROVISIONING` /
`FAILED`) → `503 RESOURCE_NOT_READY` with `status` + `provisioningState`
details; unknown product → `404 PRODUCT_NOT_FOUND`; missing `tenant:read` →
`403 TENANT_ACCESS_DENIED`.

## Products

Base `/api/v1/products` — platform-scoped registry of Cybelinx products (metadata
only, no product business data). All endpoints require the bearer token and
`product:read` / `product:write`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/products` | `product:write` | Register a product (starts `DRAFT`) |
| `GET` | `/api/v1/products?page&limit&status&search&sort` | `product:read` | Paginated list |
| `GET` | `/api/v1/products/{productId}` | `product:read` | Product detail (incl. `currentVersionId`) |
| `PUT` | `/api/v1/products/{productId}` | `product:write` | Update name/description |
| `PATCH` | `/api/v1/products/{productId}/status` | `product:write` | Status change (`{ "status": "ACTIVE" }`) |

Product status transitions are guarded:
`DRAFT → ACTIVE → DEPRECATED → DISABLED` (plus `ACTIVE → DISABLED`); `DISABLED`
is terminal. Invalid transitions → `409 PRODUCT_STATUS_TRANSITION_INVALID`;
duplicate `productCode` → `409 PRODUCT_CODE_TAKEN`; unknown id → `404
PRODUCT_NOT_FOUND`.

### Product versions

Base `/api/v1/products/{productId}/versions` — version catalog nested under a
product (metadata only).

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/products/{productId}/versions` | `product:write` | Create a version (`version` semver-like, e.g. `1.0` / `1.0.0`) |
| `GET` | `/api/v1/products/{productId}/versions` | `product:read` | List versions oldest-first |
| `GET` | `/api/v1/products/{productId}/versions/{versionId}` | `product:read` | Version detail |
| `PUT` | `/api/v1/products/{productId}/versions/{versionId}/publish` | `product:write` | Make a version `current` (clears the previous current, updates `products.current_version_id`) |

Duplicate `(product_id, version)` → `409 PRODUCT_VERSION_TAKEN`; unregistered
version id under the product → `404 PRODUCT_VERSION_NOT_FOUND`.

### Plans

Base `/api/v1/products/{productId}/plans` — plan/SKU catalog nested under a
product (metadata only; entitlements live under each plan).

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/products/{productId}/plans` | `product:write` | Create a plan (starts `DRAFT`; `planCode` uppercase, optional `trialDays`) |
| `GET` | `/api/v1/products/{productId}/plans?status` | `product:read` | List plans (optional `status` filter) |
| `GET` | `/api/v1/products/{productId}/plans/{planId}` | `product:read` | Plan detail |
| `PUT` | `/api/v1/products/{productId}/plans/{planId}` | `product:write` | Update name/description/trialDays |
| `PATCH` | `/api/v1/products/{productId}/plans/{planId}/status` | `product:write` | Status change (`{ "status": "ACTIVE" }`) |

Plan lifecycle is guarded: `DRAFT → ACTIVE → RETIRED`; `RETIRED` is terminal.
Invalid transitions → `409 PLAN_STATUS_TRANSITION_INVALID`; duplicate
`planCode` under a product → `409 PLAN_CODE_TAKEN`; unregistered plan → `404
PLAN_NOT_FOUND`.

### Entitlements

Base `/api/v1/products/{productId}/plans/{planId}/entitlements` — feature grants /
limits defined by a plan (structured JSON `value`, metadata only).

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/…/entitlements` | `product:write` | Add an entitlement (`key` like `api.enabled`, structured `value` object) |
| `GET` | `/…/entitlements` | `product:read` | List entitlements |
| `GET` | `/…/entitlements/{entitlementId}` | `product:read` | Entitlement detail (incl. `value`) |
| `PUT` | `/…/entitlements/{entitlementId}` | `product:write` | Update name/value |
| `PATCH` | `/…/entitlements/{entitlementId}/status` | `product:write` | Status change (PENDING/ACTIVE/INACTIVE/SUSPENDED) |

Entitlement state is guarded: `PENDING → ACTIVE`; `ACTIVE ⇄ SUSPENDED`; `ACTIVE
⇄ INACTIVE`. Invalid transitions → `409 ENTITLEMENT_STATUS_TRANSITION_INVALID`;
duplicate `key` on a plan → `409 ENTITLEMENT_KEY_TAKEN`; unregistered
entitlement → `404 ENTITLEMENT_NOT_FOUND`.

## Error envelope

Errors use a stable code-oriented envelope. Two shapes are produced deliberately
(matching `@cybelinx/shared` and the legacy contract):

**`ApiError` (codes carrying an explicit status):**

```json
{
  "statusCode": 404,
  "code": "TENANT_NOT_FOUND",
  "message": "Tenant not found",
  "details": null
}
```

**`ApiHttpException` (Nest-shaped `{statusCode, error, message}`):**

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Invalid access token: ..." }
```

Unhandled failures return `500 { "statusCode": 500, "message": "Internal server error" }`.

SQL errors, stack traces and credentials are never exposed.

## Versioning

- The prefix `v1` version-locks the first public surface.
- Breaking changes target a new prefix (`/api/v2/…`) while `v1` is retained.
- Business modules beyond tenants (products, plans, entitlements, memberships,
  resources, provisioning, audit, events, usage) are the active implementation
  roadmap and are documented on Swagger as they land.

## Conventions

- Request/response body: JSON (`Content-Type: application/json`).
- Identifiers are UUIDs. Pagination uses `page` (1-based) / `limit` (1–100).
- DTOs are validated with Jakarta Bean Validation; unknown body fields outside the
  DTO are rejected (whitelist model) — the tenant flow rejects a client-supplied `tenantId`.
- Sort keys are validated against an allow-list.