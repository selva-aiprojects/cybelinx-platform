package com.cybelinx.platform.api.domain;

/**
 * Least-privilege runtime PostgreSQL roles defined in TRD §13. Runtime code is
 * never granted superuser; each isolation model maps to the most restricted
 * role that still lets a product operate.
 */
public enum RuntimeRole {
    /** General pool access to a shared instance (row-level tenant isolation). */
    PRODUCT_RUNTIME,
    /** Provisioning worker used to CREATE/DROP schemas and grant ownership. */
    PRODUCT_PROVISIONER,
    /** Read-only analytic workflows (REPORTING / data export). */
    PRODUCT_READONLY,
    /** NOLOGIN owner of a single tenant schema (schema-per-tenant). */
    TENANT_SCHEMA_OWNER
}
