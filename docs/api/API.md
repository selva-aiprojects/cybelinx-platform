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