# Cybelinx Operator Manual — Configuration from a Holistic View

A short, non-technical guide to *what* is configured, *where*, and *how to get a
working system end-to-end*. Aimed at developers and operators who need to start,
wire up, and troubleshoot the platform.

---

## 1. System at a glance

```
Browser ──► Admin Portal  (Next.js, port 3000)
                 │  calls REST /api/v1 with  Authorization: Bearer <JWT>
                 ▼
            Control Plane API  (Spring Boot, port 3001)
                 │  reads/writes
                 ▼
            PostgreSQL 17  (cybelinx_platform)   ◄── Event Worker (port 3002)
                                                        polls the outbox table and delivers events

Identity:   the API does NOT store passwords. It validates JWTs issued by an
            Identity Provider (IDP) you configure. Dev default = shared HMAC secret.
Events:     produced into the database (transactional outbox), delivered by the Event Worker.
```

Ports and what they mean:

| Port | Service | How to start |
| --- | --- | --- |
| 3000 | Admin Portal (browser UI) | `npm run dev:portal` |
| 3001 | Control Plane API (all business REST under `/api/v1`) | `npm run dev:api` |
| 3002 | Event Worker (processes outbox events) | `npm run dev:worker` |
| 5432 | PostgreSQL (local via Docker) | `npm run db:up` |

---

## 2. Where configuration lives (4 places)

Most people get confused because config is split across layers. There is no single
`config.json` — each component reads its own inputs:

| # | Place | Who reads it | Example |
| --- | --- | --- | --- |
| 1 | **OS environment / `.env`** | `central-api`, `event-worker` (Spring maps them) | `API_PORT`, `IDP_JWT_SECRET`, `SPRING_DATASOURCE_*` |
| 2 | **Portal build-time env** (`apps/admin-portal/.env.local`) | Admin Portal only | `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3001/api/v1`) |
| 3 | **Portal Settings screen** (stored in your browser) | Admin Portal at runtime, overrides #2 | API token, API base URL |
| 4 | **`infra/docker/docker-compose.yml`** | PostgreSQL container | DB user / password / port |

**Overrides in the browser:** whatever you type in **Settings** wins over the
portal build-time variable. Two browser-storage keys:
`cybelinx_api_token` and `cybelinx_api_base_url`.

---

## 3. Full environment-variable reference

Copy `.env.example` → `.env` (or export in your shell). Defaults already match the
local Docker Postgres.

### Core / ports

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_PORT` | `3001` | Control Plane API port |
| `WORKER_PORT` | `3002` | Event Worker port |
| `LOG_LEVEL` | `info` | Logging verbosity |

### Database (Spring datasource)

| Variable | Default |
| --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/cybelinx_platform` |
| `SPRING_DATASOURCE_USERNAME` | `cybelinx` |
| `SPRING_DATASOURCE_PASSWORD` | `cybelinx_dev_password` |

(The Event Worker derives its datasource automatically and reuses the same database;
Flyway migrations are owned by the API.)

### CORS

| Variable | Default | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | `http://localhost:3000` | Which browser origins may call the API. Comma-separated. Add your deployed portal URL here. |

### Identity Provider (`cybelinx.idp.*`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `IDP_PROVIDER` | `generic` | Just a **label** written into the `user_identities` table. Does not select the signing method. |
| `IDP_JWT_SECRET` | *(empty)* | Shared HMAC key for dev tokens. **Must be ≥ 32 characters.** |
| `IDP_JWKS_URI` | *(empty)* | Full URI of the IDP's JWKS (RSA certificates) for **production** verification. |
| `IDP_ISSUER` | *(empty)* | When set, tokens must carry this `iss` claim. |
| `IDP_AUDIENCE` | *(empty)* | When set, tokens must carry this `aud` claim. |
| `IDP_JWT_CLOCK_SKEW_SECONDS` | `0` | Allowed clock drift when checking `exp`/`nbf`. |

**How the API picks a verifier (precedence):**
```
IDP_JWT_SECRET set?  ──► HMAC verifier (HS256)      ← dev
else IDP_JWKS_URI set? ─► JWKS verifier (RSA)       ← production
else                      request fails: "JWT signature verification is not configured"
```

### Event Worker (outbox)

| Variable | Default | Purpose |
| --- | --- | --- |
| `WORKER_POLL_INTERVAL_MS` | `5000` | How often the worker looks for new events |
| `WORKER_BATCH_SIZE` | `50` | Max events claimed per poll |
| `WORKER_MAX_ATTEMPTS` | `5` | Retries before an event is dead-lettered |
| `WORKER_LEASE_SECONDS` | `300` | Lease on a claimed event (reclaimed if the worker dies) |
| `WORKER_CONSUMER_NAME` | `outbox-worker` | Idempotency key for "already processed" |

### Admin Portal

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api/v1` | Where the browser sends API calls |

---

## 4. Configuration recipes (end to end)

### Recipe A — Full local dev (everything on one machine)

```bash
# 1. Database
npm run db:up

# 2. Backend (run all backend tests once, also validates DB schema + migrations)
npm run test:backend

# 3. Identity — set exactly the same secret in every case; restart API after changing
set IDP_JWT_SECRET=replace-me-32-bytes-minimum-xxxxxxxx
set API_PORT=3001

# 4. Start services (3 terminals)
npm run dev:api      # API on 3001
npm run dev:worker   # Worker on 3002
npm run dev:portal   # Portal on 3000

# 5. Mint a token (default sub = seed-dev-admin-0001, seeded by migration V6)
npm run mint:jwt

# 6. Browser → http://localhost:3000 → Settings → paste token → Save
#    Dashboard, Products, Tenants, etc. now load live data.
```

Checklist if something is empty/red in the portal:

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Unable to reach the API" | API not running, or wrong base URL in Settings | Start `npm run dev:api`; Settings → correct base URL |
| `401 Unauthorized` | Token missing/expired, or secret mismatch | Re-mint (`npm run mint:jwt`), paste again |
| "signature verification is not configured" | `IDP_JWT_SECRET` empty on **both** API *and* mint | Set secret in env; restart API; re-mint |
| Empty lists | Seed data not applied (should be, via V6) | `npm run test:backend` applies migrations on the dev DB |

### Recipe B — Portal pointed at a remote API (e.g. Vercel preview)

1. The API only runs locally (or on a server you open). Point the portal at it:
   - Best: Settings → API Base URL = `https://your-api-host/api/v1`.
   - Or build-time: `NEXT_PUBLIC_API_BASE_URL=... npm run build`.
2. Make sure that host's `CORS_ORIGINS` includes the portal origin (e.g. `https://admin.cybelinx.app`).
3. Token must be minted/obtained with the exact same secret (or the JWKS verifier)
   that the remote API uses.

### Recipe C — Production-ish identity (JWKS / RSA from a real IDP)

```
IDP_JWKS_URI=https://your-idp.example/.well-known/jwks.json
IDP_ISSUER=https://your-idp.example/
IDP_AUDIENCE=cybelinx-admin-portal
IDP_JWT_CLOCK_SKEW_SECONDS=30
```
- Leave `IDP_JWT_SECRET` **empty** so the JWKS path is chosen.
- Users must exist as `(provider, subject)` entries in `user_identities` and have an
  active tenant membership with a platform role; the API derives tenant context from
  the identity, never from client-supplied tenant IDs.

### Recipe D — Tuning the event pipeline

- Events not being delivered? Check worker logs; raise `WORKER_POLL_INTERVAL_MS` lower, or
  check `WORKER_*` settings against throughput.
- A failed event retries `WORKER_MAX_ATTEMPTS` times, then lands in the dead-letter
  queue (marker state on the event). Replay manually via the worker's `replayDeadLettered()`.
- Guarantees: at-least-once. Consumers must be idempotent (key = `event_id + consumer`).

---

## 5. Identity model cheat-sheet

| Term | Meaning | Where set |
| --- | --- | --- |
| `sub` (subject claim) | Who the token says the user is | Token (`--sub` when minting) |
| Identity key | `(identity_provider, external_subject)` | `IDP_PROVIDER` label + `sub` |
| Platform user | Internal account mapped to identities | Seeded (`dev.admin@cybelinx.test`) |
| Membership | User ↔ tenant, with a status | Tenant detail page (read-only today) |
| Roles | Grant permissions (`CYBELINX_PLATFORM_ADMIN`, `TENANT_ADMIN`, …) | Seeded by V6 |

Dev bootstrap identity (created by migration `V6`):

```
provider = generic   sub = seed-dev-admin-0001   email = dev.admin@cybelinx.test
roles    = CYBELINX_PLATFORM_ADMIN, TENANT_ADMIN   (for the seeded ACME tenant)
```

---

## 6. Useful checks

```bash
npm run check          # frontend: build + lint + typecheck + test
npm run test:backend   # backend: full Maven test suite (19 ITs) against real Postgres
npm run mint:jwt -- --help
```

Health endpoints (API): `GET /api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`.
Swagger UI: `GET /api/v1/docs`.

---

## 7. Golden rules

1. **The IDP secret must match everywhere** — API and minting (`npm run mint:jwt`)
   read the same `IDP_JWT_SECRET`, and it must be ≥ 32 characters.
2. **Restart the API after changing `IDP_*`, `CORS_ORIGINS`, or datasource variables.**
3. **Never commit secrets** — use `.env`/provider secrets, not git.
4. **Browser Settings override build-time config** — clear
   `cybelinx_api_token` / `cybelinx_api_base_url` in your browser to "reset".
5. **Schema changes go through Flyway migrations only** (Hibernate runs `ddl-auto: validate`).
6. Missing rows after a fresh setup? Migration `V6` seeds reference data **idempotently** —
   existing rows are never duplicated.

---

## 8. Jioplix Hospital Management System (https://jioplix.com) SaaS Onboarding

The Cybelinx platform provides canonical REST onboarding APIs for migrating existing standalone **Jioplix** hospital/clinic customers and registering new multi-tenant SaaS subscriptions. All products (Jioplix, StoreAI, Synthalyst, etc.) fulfill the same generic contract — `productCode` selects the adapter, and `externalId` maps to a `TenantExternalIdentifier`:

### Generic REST Endpoints (`/api/v1/onboarding`)

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/onboarding/execute` | `tenant:write` | Execute onboarding for one tenant. Body: `{ productCode, externalId, tenantName, tenantCode, planCode, adminEmail?, customFields? }` (`productCode` required; `planCode` defaults to the product's `defaultPlanCode`). |
| `POST` | `/api/v1/onboarding/batch` | `tenant:write` | Bulk onboard a list of tenants in a single request. Body: `{ items: GenericOnboardRequest[] }`. |
| `GET` | `/api/v1/onboarding/status/{productCode}/{externalId}` | `tenant:read` | Query onboarding and resource provisioning status for a product's external ID. |
| `GET` | `/api/v1/onboarding/definitions` | `tenant:read` | List supported product onboarding definitions (provider, default plan, schema prefix, health-check endpoint, dynamic fields). |

### Operational Steps for Customer Migration
1. Issue a `POST /api/v1/onboarding/execute` payload with `productCode: "JIOPLIX"`, legacy `externalId` (e.g. `jio-hosp-101`), `tenantName`, `tenantCode`, `planCode` (e.g. `JIOPLIX_ENTERPRISE`), and optional hospital admin email.
2. The control plane idempotently creates/links the canonical tenant, attaches active subscription, registers `POSTGRES_SCHEMA` resources, assigns `TENANT_ADMIN` role, and emits `TENANT_CREATED` and `PRODUCT_ENABLED` outbox events.
3. Poll `GET /api/v1/onboarding/status/{productCode}/{externalId}` until `resourceStatus` reaches a terminal state (`SUCCEEDED` / `PROVISIONED` / `ACTIVE`). For async products the onboarding UI polls this endpoint automatically after `execute` returns.