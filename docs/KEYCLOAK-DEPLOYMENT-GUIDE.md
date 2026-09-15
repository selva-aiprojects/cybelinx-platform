# Keycloak Deployment & Integration Guide for Cybelinx SaaS Platform

This guide explains why **Keycloak cannot be deployed on Vercel**, recommends the best deployment platforms, provides step-by-step setup guides, and shows how your Vercel-hosted frontend integrates with Keycloak.

---

## 1. Why Keycloak Cannot Run on Vercel

> [!WARNING]
> **Vercel is incompatible with Keycloak.**

* **Vercel** is a **serverless platform** built for stateless frontends (Next.js, React) and short-lived edge functions (10–60s max execution time). It does not support persistent background processes, long-running JVM/Java runtimes, or incoming database connection pools.
* **Keycloak** is a **stateful Java/Quarkus server application** requiring a long-running process, an active HTTP/HTTPS port (8080/8443), background token maintenance threads, and a dedicated PostgreSQL/MySQL database.

---

## 2. Recommended Deployment Options for Keycloak

### Option A: Cloud-Managed Keycloak (Easiest & Zero Maintenance)
* **Cloud-IAM** or **PhaseTwo.io**: Dedicated managed Keycloak clusters with auto-backups, SSL, and custom domains.
* **SaaS Alternatives**: Auth0, Supabase Auth, Clerk, or AWS Cognito.

### Option B: Container Hosting (Best Low-Cost / Production Options)
* **Render.com** or **Railway.app**: Single-click Docker + PostgreSQL deployment ($5–$20/mo).
* **AWS ECS Fargate / Google Cloud Run / Azure Container Apps**: Serverless container services running the official Keycloak Docker image (`quay.io/keycloak/keycloak:latest`).
* **VPS (Hetzner / DigitalOcean / Linode)**: Running Docker Compose (`keycloak` + `postgres`).

---

## 3. Step-by-Step Setup: Deploying Keycloak on Railway.app / Render.com

### Step 1: Deploy PostgreSQL Database
1. Create a PostgreSQL instance on Railway/Render.
2. Note the connection details: `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`.

### Step 2: Deploy Keycloak Container
Use official image `quay.io/keycloak/keycloak:latest` with environment variables:

```env
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://<your-db-host>:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<db-password>
KC_HOSTNAME=https://keycloak.yourdomain.com
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<secure-admin-password>
```

Start command:
```bash
start --optimized --http-enabled=true
```

---

## 4. Connecting Vercel Admin Portal to Keycloak

Your Next.js Admin Portal (hosted on **Vercel**) and Cybelinx API (hosted on Railway/AWS/Render) communicate with Keycloak over standard OpenID Connect (OIDC):

```
┌────────────────────────┐         OIDC Redirect / PKCE Token         ┌───────────────────────┐
│ Next.js Admin Portal   │ ─────────────────────────────────────────► │ Keycloak IAM          │
│ (Hosted on Vercel)     │ ◄───────────────────────────────────────── │ (Render/Railway/AWS)  │
└────────────────────────┘                                            └───────────────────────┘
            │                                                                     ▲
            │ Bearer JWT Token                                                    │ JWKS Cert Fetch
            ▼                                                                     │
┌────────────────────────┐                                                        │
│ Cybelinx Central API   │ ───────────────────────────────────────────────────────┘
│ (Java Spring Boot)     │  Validate Token via IDP_JWKS_URI
└────────────────────────┘
```

### Cybelinx API Environment Configuration (`.env`):
```env
IDP_PROVIDER=keycloak
IDP_ISSUER=https://keycloak.yourdomain.com/realms/cybelinx
IDP_JWKS_URI=https://keycloak.yourdomain.com/realms/cybelinx/protocol/openid-connect/certs
IDP_AUDIENCE=cybelinx-admin-portal
IDP_JWT_CLOCK_SKEW_SECONDS=30
```
