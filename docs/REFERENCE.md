# Cybelinx Central SaaS Platform & Multi-Product Ecosystem
## Canonical Master Reference Guide

> **Authoritative Baseline & Single Source of Truth**  
> **Document ID:** CYB-REF-2026-MASTER  
> **Version:** 1.0 (Production Release)  
> **Classification:** Enterprise Architecture, Platform Invariants & Developer Reference  
> **Date:** September 22, 2026  
> **Audience:** All Core Engineers, Platform Architects, Product Integrators, and AI Coding Assistants  

---

## 1. Golden Architectural Rules (Never Violate)

Every engineer and AI assistant working on the Cybelinx platform or integrating external products must uphold these immutable invariants:

1. **The Autonomous Control Plane Principle:**
   - The Cybelinx Platform repository (`Cybelinx-platform`) is strictly an **independent, generic SaaS Control Plane**.
   - It centralizes SaaS plumbing (tenant registry, user identity, subscriptions, entitlements, outbox events, shared client packages, and language intelligence).
   - **Do NOT implement downstream product-specific backends or business logic in this repository.** Product-specific code (e.g., Python/FastAPI for Synthalyst, Express for LIMS) belongs strictly in downstream product repositories.
2. **Zero Operational Schemas in Control Plane DB:**
   - The central PostgreSQL database (`cybelinx-platform` on Aiven) contains **only** the `public` schema for SaaS control-plane metadata (`tenants`, `products`, `plans`, `tenant_products`, `tenant_resources`, `platform_events`, `audit_events`, `users`).
   - Operational business tables (`patients`, `clinical_encounters`, `lab_samples`, `store_orders`, `cart_items`, `employees`, `payroll`, `hotel_bookings`, `brokerage_trades`, `invoices`) **must never** be created in or queried by the central control plane database.
3. **The Two Validated Domain Routing Archetypes:**
   - **Archetype A (Dedicated Standalone Apex Domain):** Reserved for products with independent brand apex domains — specifically `https://{tenant}.jioplix.com` (proven & production-live with Jioplix HMS).
   - **Archetype B (Cybelinx Subdomain Network):** Standardized for all other 12+ Cybelinx SaaS products — `https://{tenant}.{product}.cybelinx.com` (proven & production-live with StoreAI at `https://newage.storeai.cybelinx.com`).
4. **Tenant Isolation by Construction:**
   - Multi-tenant data planes default to `SCHEMA_PER_TENANT` (or `DEDICATED_DATABASE` / `DEDICATED_INFRASTRUCTURE` for sovereign tiers).
   - The tenant context is **never** accepted from untrusted client request bodies (`tenantId`). It is derived strictly from verified JWT claims or verified host headers.
5. **Universal SSO & Frictionless JIT Provisioning:**
   - Central control plane mints signed 24h HMAC-SHA256 JWT launch tokens (`POST /api/v1/auth/sso/token`).
   - Downstream products implement `POST /api/auth/sso/exchange` to validate tokens, establish native sessions, self-heal missing tenants, and auto-provision users without manual DB seeding.
   - Product login screens auto-bypass on `?sso_token=...` and provide a manual "⚡ Continue with Supabase SSO" button.
6. **Language & Utility Engine Resilience (Fail-Open):**
   - In-memory prefix Trie spell-checking operates client-side under 300ms.
   - Server-side grammar and terminology checks are asynchronous, non-blocking, and fail-open. A language engine downtime must never block saving clinical, financial, or e-commerce records.

---

## 2. High-Level Architecture Topology

```text
                               +-------------------------------------------------------+
                               |         Cybelinx SaaS Central Control Plane           |
                               |    (https://cybelinx-platform-admin-portal.vercel.app)  |
                               |                                                       |
                               |  - Central Registry: tenants, products, subscriptions |
                               |  - Universal SSO Launch Token Engine (HMAC-SHA256)     |
                               |  - Transactional Outbox & Platform Audit Events       |
                               |  - Control Plane DB: "public" ONLY (Zero Business PHI)|
                               +-------------------------------------------------------+
                                        |                             |
                       Signed SSO Token |            Signed SSO Token |
                     (?sso_token=...JWT)|          (?sso_token=...JWT)|
                                        v                             v
           +----------------------------------------+   +----------------------------------------+
           |       Jioplix Healthcare HMS           |   |       StoreAI Composable Commerce      |
           |     (https://wellness.jioplix.com)     |   |   (https://newage.storeai.cybelinx.com)|
           |                                        |   |                                        |
           | - Archetype A: Dedicated Apex Domain   |   | - Archetype B: Cybelinx Subdomain Net  |
           | - POST /api/auth/sso/exchange          |   | - @cybelinx/sdk Express / Supabase SSO |
           | - JIT User Provisioning (ADMIN, Doctor)|   | - Headless Commerce & AI Recommendation|
           | - Product DB: Supabase ("wellness")    |   | - Product DB: Neon / StoreAI DB        |
           +----------------------------------------+   +----------------------------------------+
                                        |                             |
                                        +--------------+--------------+
                                                       |
                                        v              v              v
                              +------------------+ +------------------+ +------------------+
                              |  SynthalystHRM   | |    LIMS Suite    | |   StaySphere /   |
                              |  (HR & Payroll)  | |  (Diagnostics)   | | Smartbooks/Tradinx|
                              |*.synthalyst.     | |  *.lims.         | | *.staysphere.     |
                              | cybelinx.com     | |  cybelinx.com    | |  cybelinx.com     |
                              +------------------+ +------------------+ +------------------+
```

---

## 3. Product Portfolio & Domain Routing Matrix

Cybelinx governs 13+ specialized SaaS software products across two validated routing archetypes:

| Product Code | Product Name & Domain | Routing Archetype | Subdomain Pattern | Live Production URL / Example | Product DB Host | Isolation Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`JIOPLIX`** | Jioplix Healthcare Information System (HMS) | **Archetype A** (Dedicated Apex) | `https://${tenant}.jioplix.com` | `wellness.jioplix.com`, `nixon.jioplix.com` | Supabase PostgreSQL (`aws-1-ap-southeast-1`) | `SCHEMA_PER_TENANT` |
| **`STOREAI`** | StoreAI Composable Commerce & Merchandising | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.storeai.cybelinx.com` | `newage.storeai.cybelinx.com` | Neon / Dedicated PostgreSQL | `SCHEMA_PER_TENANT` |
| **`SYNTHALYST`** | SynthalystHRM (HRMS, Payroll, TDS Compliance) | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.synthalyst.cybelinx.com` | `acme.synthalyst.cybelinx.com` | Dedicated PostgreSQL (`synthalyst-db`) | `SCHEMA_PER_TENANT` |
| **`LIMS`** | Laboratory Information Management System | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.lims.cybelinx.com` | `metropolis.lims.cybelinx.com` | Dedicated PostgreSQL (`lims-db`) | `SCHEMA_PER_TENANT` |
| **`SMARTBOOKS`** | Smartbooks Cloud Accounting & Finance | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.smartbooks.cybelinx.com` | `tata.smartbooks.cybelinx.com` | Dedicated PostgreSQL (`smartbooks-db`) | `SCHEMA_PER_TENANT` |
| **`STAYSPHERE`** | StaySphere Hospitality & Property PMS | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.staysphere.cybelinx.com` | `marriott.staysphere.cybelinx.com` | Dedicated PostgreSQL (`staysphere-db`) | `SCHEMA_PER_TENANT` |
| **`TRADINX`** | Tradinx Trading Platform & Portfolio Analytics | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.tradinx.cybelinx.com` | `zerodha.tradinx.cybelinx.com` | Low-Latency DB Cluster | `SCHEMA_PER_TENANT` |
| **`CARTLINX`** | Cartlinx E-Commerce & Marketplace Platform | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.cartlinx.cybelinx.com` | `urbanic.cartlinx.cybelinx.com` | Dedicated Commerce DB | `SCHEMA_PER_TENANT` |
| **`PHARMA`** | PharmaTrack Serialization & Batch Traceability | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.pharma.cybelinx.com` | `sunpharma.pharma.cybelinx.com` | Dedicated Pharma DB | `SCHEMA_PER_TENANT` |
| **`REALESTATE`** | Real-Estate & Asset Management Platform | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.realestate.cybelinx.com` | `dlf.realestate.cybelinx.com` | Dedicated Property DB | `SCHEMA_PER_TENANT` |
| **`SUPPLYCHAIN`** | Supply Chain Management (SCM) & Logistics | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.supplychain.cybelinx.com` | `delhivery.supplychain.cybelinx.com` | Dedicated Logistics DB | `SCHEMA_PER_TENANT` |
| **`CAREDATA`** | Health Interoperability Hub (ABDM & FHIR R4) | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.caredata.cybelinx.com` | `gateway.caredata.cybelinx.com` | Decoupled Integration DB | `SCHEMA_PER_TENANT` |
| **`EXAMPAD`** | Online Assessment & Remote Proctoring Engine | **Archetype B** (Cybelinx Subdomain) | `https://${tenant}.exampad.cybelinx.com` | `bits.exampad.cybelinx.com` | Dedicated Assessment DB | `SCHEMA_PER_TENANT` |

---

## 4. Repository Structure & Packages Directory

```
Cybelinx-platform/
├── backend/
│   ├── central-api/           # Authoritative Control Plane API (Java 21 / Spring Boot, port 3001)
│   ├── event-worker/          # Transactional Outbox Relay Process (Java 21 / Spring Boot, port 3002)
│   └── cybelinx-shared/       # Java shared library (error model, constants, env ports)
├── apps/
│   └── admin-portal/          # Control Plane Admin Web Console (Next.js 16 / React 19)
├── packages/
│   ├── shared/                # Core constants, error models, and standard TypeScript interfaces
│   ├── sdk/                   # Multi-tenant Node.js/Express SDK & schema search_path helper
│   ├── core/                  # Currency/date/number formatters, Indian National IDs (PAN, GSTIN, ABHA)
│   ├── language/              # Client-side prefix Trie spell checker, 4-tier dictionary resolver
│   └── ui/                    # Shared React UI components & <SmartTextEditor /> marquee component
├── dictionaries/              # 10 Curated domain JSON dictionaries (1,500+ terms)
│   ├── healthcare.json        # Jioplix HMS & Clinic terminology
│   ├── hrms.json              # Synthalyst HRMS, statutory & payroll terms
│   ├── lims.json              # Pathology, laboratory & diagnostic terms
│   ├── finance.json           # Smartbooks accounting, GST & tax terms
│   ├── hospitality.json       # StaySphere hotel PMS & guest management
│   ├── realestate.json        # Real estate, lease & property terminology
│   ├── trading.json           # Tradinx securities, derivatives & order types
│   ├── pharma.json            # PharmaTrack serialization & clinical pharma
│   ├── ecommerce.json         # Cartlinx e-commerce, merchandising & fulfillment
│   ├── supplychain.json       # Logistics, freight, inventory & SCM
│   └── common.json            # Cross-cutting enterprise terminology
├── docs/                      # PRDs, TRDs, architecture specs, developer tutorials
├── infra/                     # Docker Compose, PostgreSQL initialization, deployment scripts
└── retired/                   # Pre-cutover TypeScript backend (REFERENCE ONLY — NOT BUILT)
```

---

## 5. Sub-Platform Packages Specification

### 5.1 `@cybelinx/core` (`packages/core`)
- **Currency Formatters**:
  - `formatCurrency(amount, 'INR' | 'USD' | 'EUR' | 'GBP', { notation?: 'standard' | 'compact' })`
  - Compact notation support (e.g. `₹1.50 L`, `₹2.50 Cr`, `$1.50M`).
- **National ID Validators**:
  - `validatePAN(pan)` — Indian Permanent Account Number (regex: `^[A-Z]{5}[0-9]{4}[A-Z]$`).
  - `validateGSTIN(gstin)` — Indian Goods & Services Tax Identification Number (regex + Verhoeff/modulus check).
  - `validateABHA(abha)` — Ayushman Bharat Health Account (14-digit format `XX-XXXX-XXXX-XXXX`).
  - `validateAadhaar(aadhaar)` — Indian Aadhaar 12-digit format with Verhoeff algorithm.
- **Common Validators**: `validateEmail`, `validatePhone`, `validateUrl`, `validateFileSize`, `validateFileType`.
- **Async Utilities**: `debounce`, `throttle`, `sleep`, `deepMerge`, `generateId`.

### 5.2 `@cybelinx/language` (`packages/language`)
- **Prefix Trie Spell Engine**:
  - In-memory character Trie supporting sub-300ms verification.
  - Levenshtein edit distance generator ($\le 2$) for instant typographical corrections.
- **4-Tier Dictionary Resolver**:
  - Priority chain: `Common` $\rightarrow$ `Domain` $\rightarrow$ `Tenant` $\rightarrow$ `User`.
  - Checksum validation: Polynomial rolling checksum verifying dictionary dictionary integrity.
- **Fail-Open Grammar Client**:
  - Non-blocking asynchronous checks against Tier 2 server-side engine.
  - Sliding-window Circuit Breaker: trips on consecutive failures and immediately falls back to in-browser Trie spell check without UI freeze or error modal.

### 5.3 `@cybelinx/ui` (`packages/ui`)
- **Marquee Drop-in Component: `<SmartTextEditor />`**:
  - Domain selector for all 10 business domains.
  - Interactive spelling error underlines (`.cblx-spell-error`) and grammar underlines (`.cblx-grammar-error`).
  - Contextual suggestion popover with: "Replace With", "Add to Tenant Dictionary", "Add to Personal Dictionary", "Ignore All".
  - Offline / degraded resilience badge ("Offline Spell Check Active").
- **Form Controls & Modals**:
  - `<Input mask="currency" />`, `<TextArea />`, `<SearchInput />`, `<Tooltip />`, `<NotificationToast />`, `<ConfirmationModal />`.

### 5.4 `@cybelinx/sdk` (`packages/sdk`)
- **Multi-Tenant Middleware**:
  - `createCybelinxMiddleware({ productCode, allowAnonymous })`
  - Extracts tenant context from bearer JWT or headers (`X-Tenant-Code`, `X-Tenant-ID`).
  - `getSearchPathSql(schemaName)` generating PostgreSQL dynamic DDL switch: `SET search_path TO "tenant_schema", public;`.

---

## 6. Universal SSO & Just-In-Time (JIT) Provisioning Standard

### 6.1 Token Generation
When an admin launches a product or an employee clicks a magic email link, the central API generates a token:
- **Endpoint**: `POST /api/v1/auth/sso/token`
- **Algorithm**: `HMAC-SHA256`
- **Validity**: 24 hours
- **Payload Claims**:
  ```json
  {
    "user": "doctor@hospital.com",
    "email": "doctor@hospital.com",
    "tenantId": "nixon",
    "tenantCode": "nixon",
    "role": "admin",
    "type": "tenant",
    "iss": "cybelinx-control-plane",
    "exp": 1789994000
  }
  ```
- **Launch Redirect URL**:
  `https://${subdomain}.${product_domain}/login?sso_token=${token}&redirect=${path}`

### 6.2 Token Exchange Endpoint (`POST /api/auth/sso/exchange`)
Every downstream product backend exposes this route:
1. Verify JWT signature with shared `JWT_SECRET`.
2. **Tenant Self-Healing**: If tenant is not in product's registry (`nexus.tenants`), auto-register and clone schema from base template.
3. **User JIT Provisioning**: If user not found in tenant schema, query `information_schema.columns` to dynamically detect `password` vs `password_hash` column, then insert the user with verified role (`ADMIN`, `DOCTOR`, `STAFF`).
4. Return native session token and role-based navigation menus.

### 6.3 Frontend Login Auto-Bypass
In the product's login page:
1. On component mount (`useEffect`), inspect `window.location.search` for `sso_token`.
2. If present, display smooth spinner, call `/api/auth/sso/exchange`, persist session tokens to `localStorage`, and navigate to `/tenant/dashboard`.
3. Render a manual "⚡ Continue with Supabase SSO" / "Sign in with Cybelinx SSO" button as a zero-password alternative.

---

## 7. Decoupled Database Topology

```
+-----------------------------------------------------------------------------------------+
|                                    AIVEN CLUSTER                                        |
| Database: cybelinx-platform                                                             |
| Schema: "public" ONLY                                                                   |
| Tables: tenants, products, plans, tenant_products, tenant_resources,                    |
|         platform_events, audit_events, users, provisioning_jobs                         |
+-----------------------------------------------------------------------------------------+
                                             |
                         Decoupled Isolated Data Connections
                                             |
     +---------------------------------------+---------------------------------------+
     |                                       |                                       |
     v                                       v                                       v
+--------------------------+    +--------------------------+    +--------------------------+
|     SUPABASE CLUSTER     |    |       NEON CLUSTER       |    |   DEDICATED POSTGRES     |
| Jioplix HMS & Clinics    |    | StoreAI Retail Commerce  |    | SynthalystHRM & LIMS     |
| Schemas:                 |    | Schemas:                 |    | Schemas:                 |
| - nexus (registry)       |    | - public                 |    | - synthalyst_acme        |
| - wellness (template)    |    | - tenant_newage_storeai  |    | - lims_apollo_lab        |
| - nixon (active tenant)  |    | - tenant_nike_storeai    |    | - staysphere_marriott    |
+--------------------------+    +--------------------------+    +--------------------------+
```

---

## 8. Development, Testing & Verification Commands

All core packages must be verified before pushing any code:

```bash
# 1. Build all 5 TypeScript packages to dist/
npm run build:packages

# 2. Run TypeScript typecheck across all 6 workspaces
npm run typecheck

# 3. Execute all unit and integration test suites
npm test

# 4. Backend tests (Spring Boot central-api and event-worker)
npm run test:backend

# 5. Local development stack
npm run db:up           # Start local postgres container
npm run dev:api         # Start central-api on port 3001
npm run dev:worker      # Start event-worker on port 3002
npm run dev:portal      # Start admin-portal on port 3000
```

---

## 9. Code Change Guardrails & Checklist

Before submitting or committing any change to the Cybelinx platform or its sub-packages, review this checklist:

- [ ] **No Product Business Tables:** Have you ensured no product-specific tables (`patients`, `orders`, `employees`, etc.) were introduced into the control plane?
- [ ] **No Product-Specific Endpoints:** Does `central-api` remain purely a generic SaaS control plane, free of product domain logic?
- [ ] **Subdomain Compliance:** Does any domain routing reference conform to **Archetype A** (`*.jioplix.com`) or **Archetype B** (`*.{product}.cybelinx.com`)?
- [ ] **Fail-Open Resilience:** Do all language intelligence or shared utility routines fail open and never crash the host application?
- [ ] **TypeScript Types Isolation:** Do sub-packages declare explicit `"types"` (`["node", "jest"]` or `["node", "react", "react-dom"]`) to prevent global symbol pollution?
- [ ] **Zero PHI in Logs:** Are all logs, audit trails, and platform events free of personal healthcare information (PHI), passwords, or unencrypted secrets?
- [ ] **Full Test & Build Pass:** Have `npm run build:packages`, `npm run typecheck`, and `npm test` all passed with 0 errors?

---

*For detailed developer onboarding guides, copy-pasteable examples for 6 products, and full API references, consult [`docs/DEVELOPER-TUTORIAL.md`](DEVELOPER-TUTORIAL.md).*
