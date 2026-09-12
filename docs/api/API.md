# API Reference

All Control Plane endpoints are namespaced under **`/api/v1`** and served by
`apps/central-api` (NestJS). The Admin Portal and products must never touch the
platform database directly.

Interactive OpenAPI/Swagger docs: `GET /api/v1/docs` (when the API is running).

## Health endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Liveness + service metadata (no dependencies) |
| `GET` | `/api/v1/health/live` | Terminus liveness check |
| `GET` | `/api/v1/health/ready` | Readiness — checks required dependencies (DB for the API, worker state for the event worker) |

`/health/live` and `/health/ready` return the standard Terminus envelope: HTTP
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

## Error envelope

Errors use a stable code-oriented envelope (matching `@cybelinx/shared`):

```json
{
  "code": "TENANT_ACCESS_DENIED",
  "message": "Tenant not accessible",
  "correlation_id": "3b6f7c8e-8d1a-4c6e-9a0b-2f3d4e5f6a7b"
}
```

SQL errors, stack traces and credentials are never exposed.

## Versioning

- The prefix `v1` version-locks the first public surface.
- Breaking changes target a new prefix (`/api/v2/…`) while `v1` is retained.
- Business modules (tenants, memberships, products, entitlements, resources,
  provisioning, audit, events, usage) arrive in subsequent implementation
  phases and will be documented here and on Swagger.

## Conventions

- Request/response body: JSON (`Content-Type: application/json`).
- Identifier style, pagination and sorting conventions are established with the
  first business module (Phase 2).
- Authentication headers/flow arrive with Identity Provider integration (Phase: Identity).