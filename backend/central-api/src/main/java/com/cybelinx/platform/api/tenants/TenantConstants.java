package com.cybelinx.platform.api.tenants;

/** Port of {@code tenant.constants.ts}. */
public final class TenantConstants {

    public static final String PERMISSION_TENANT_READ = "tenant:read";
    public static final String PERMISSION_TENANT_WRITE = "tenant:write";

    public static final String PLATFORM_ADMIN_ROLE = "CYBELINX_PLATFORM_ADMIN";
    public static final String TENANT_ADMIN_ROLE = "TENANT_ADMIN";
    public static final String TENANT_USER_ROLE = "TENANT_USER";

    /** Product codes from the platform catalog ({@code @cybelinx/types} PRODUCT_CODES). */
    public static final String[] PRODUCT_CODES = {
        "JIOPLIX", "JIOPLIX_SMART", "LIMS", "STOREAI", "SYNTHALYST"
    };

    /** Isolation modes ({@code @cybelinx/types} ISOLATION_MODES). */
    public static final String[] ISOLATION_MODES = {
        "SHARED_POOL", "SCHEMA_PER_TENANT", "DEDICATED_DATABASE", "DEDICATED_INFRASTRUCTURE"
    };

    /** Environments ({@code @cybelinx/types} ENVIRONMENTS). */
    public static final String[] ENVIRONMENTS = {
        "DEVELOPMENT", "STAGING", "PRODUCTION"
    };

    /** Sort keys accepted by {@code GET /tenants}. */
    public static final String[] SORT_KEYS = {
        "createdAt", "-createdAt", "name", "-name", "tenantCode", "-tenantCode"
    };

    public static final String DEFAULT_SORT = "-createdAt";

    private TenantConstants() {
    }
}