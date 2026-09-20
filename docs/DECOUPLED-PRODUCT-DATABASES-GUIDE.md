# Decoupled Product Target Database Architecture Guide

This guide details how product database instances (StoreAI DB, Jioplix DB, LIMS DB) are decoupled from the **Cybelinx SaaS Control Plane Database** (`cybelinx_platform`).

---

## 1. Architectural Overview

```text
               +-------------------------------------------+
               |  Cybelinx SaaS Control Plane DB           |
               |  (cybelinx_platform)                      |
               |  - tenants, products, subscriptions,      |
               |    roles, outbox_events                   |
               +-------------------------------------------+
                                     |
                         Outbox Event Provisioning
                                     |
           +-------------------------+-------------------------+
           |                                                   |
           v                                                   v
+-----------------------------+                     +-----------------------------+
| StoreAI Remote Database Host|                     | Jioplix Remote Database Host|
| (storeai-db.cybelinx.local) |                     | (jioplix-db.cybelinx.local) |
| - tenant_nike_store_db      |                     | - tenant_acme_hms_db        |
| - tenant_adidas_store_db    |                     |                             |
+-----------------------------+                     +-----------------------------+
```

---

## 2. Remote Target Database Connection Configuration

Each product's remote database server instance connection is resolved via system environment variables or `tenant_resources` connection metadata:

```env
# Remote StoreAI Product Database Instance
PRODUCT_DB_URL_STOREAI_PRODUCTION=jdbc:postgresql://storeai-db-prod.cybelinx.internal:5432/storeai_prod_db
PRODUCT_DB_URL_STOREAI_DEMO=jdbc:postgresql://storeai-db-demo.cybelinx.internal:5432/storeai_demo_db
PRODUCT_DB_USER_STOREAI=storeai_dba
PRODUCT_DB_PASSWORD_STOREAI=<secure_password>

# Remote Jioplix Product Database Instance
PRODUCT_DB_URL_JIOPLIX_PRODUCTION=jdbc:postgresql://jioplix-db-prod.cybelinx.internal:5432/jioplix_prod_db
PRODUCT_DB_USER_JIOPLIX=jioplix_dba
PRODUCT_DB_PASSWORD_JIOPLIX=<secure_password>
```

---

## 3. Dynamic Provisioning Execution Flow

1. **Control Plane Outbox Event**: When a merchant is onboarded, the control plane emits a `TENANT_PRODUCT_ATTACHED` event with `productCode = 'STOREAI'`.
2. **Connection Resolution (`TargetDatabaseConnectionResolver`)**: The worker resolves the dynamic `JdbcTemplate` for `storeai-db-prod.cybelinx.internal`.
3. **Product DDL Template Loading**: The worker loads `/product-schemas/storeai_tenant_schema.sql`.
4. **Remote DDL Execution**: Executes schema and table creation DDL directly against the remote StoreAI database server without touching the central control plane database.

---

## 4. Local & Vercel Testing Setup

For rapid local testing and Vercel preview environments, target database connection strings are specified via `.env` or Vercel Environment Variables:

1. **Local Development (`.env`)**:
   Add dedicated product target database URLs to `.env` (pointing to the respective product database, NEVER the central control plane DB):
   ```env
   # StoreAI Product Database
   PRODUCT_DB_URL_STOREAI_PRODUCTION=jdbc:postgresql://localhost:5433/storeai_prod
   PRODUCT_DB_URL_STOREAI_DEMO=jdbc:postgresql://localhost:5433/storeai_demo
   PRODUCT_DB_USER_STOREAI=storeai_user
   PRODUCT_DB_PASSWORD_STOREAI=storeai_dev_password

   # Jioplix Product Database (Supabase)
   PRODUCT_DB_URL_JIOPLIX_PRODUCTION=jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   PRODUCT_DB_USER_JIOPLIX=postgres.qnrypqwgxpmrlxanvbwq
   PRODUCT_DB_PASSWORD_JIOPLIX=<supabase_password>
   ```

2. **Vercel Environment Variables**:
   In Vercel Dashboard ➔ **Project Settings ➔ Environment Variables**:
   * Key: `PRODUCT_DB_URL_STOREAI_PRODUCTION` | Value: `jdbc:postgresql://<your-cloud-db-host>:5432/storeai_prod`
   * Key: `PRODUCT_DB_USER_STOREAI` | Value: `<cloud_user>`
   * Key: `PRODUCT_DB_PASSWORD_STOREAI` | Value: `<cloud_password>`

3. **Production Transition Path (Vault / Secrets Manager)**:
   Once local and Vercel testing pass thoroughly, production deployment shifts credential resolution from `.env` to HashiCorp Vault URNs (`credential_reference = "vault://prod/products/storeai/db"`).

