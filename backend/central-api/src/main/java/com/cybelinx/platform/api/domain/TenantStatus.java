package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "TenantStatus". */
public enum TenantStatus {
    PROVISIONING,
    ACTIVE,
    SUSPENDED,
    DEACTIVATED,
    DELETION_PENDING,
    DELETED
}