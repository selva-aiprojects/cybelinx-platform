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
