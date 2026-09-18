package com.cybelinx.platform.api.domain;

/** Domain constants ported from {@code @cybelinx/types}. */
public final class Catalog {

    public static final String[] TENANT_STATUSES = {
        "PROVISIONING", "ACTIVE", "SUSPENDED", "DEACTIVATED", "DELETION_PENDING", "DELETED"
    };

    public static final String[] ISOLATION_MODES = {
        "SHARED_POOL", "SCHEMA_PER_TENANT", "DEDICATED_DATABASE", "DEDICATED_INFRASTRUCTURE"
    };

    public static final String[] ENVIRONMENTS = {
        "DEVELOPMENT", "STAGING", "PRODUCTION"
    };

    public static final String[] PRODUCT_CODES = {
        "JIOPLIX", "JIOPLIX_SMART", "LIMS", "STOREAI", "SYNTHALYST"
    };

    private Catalog() {
    }
}