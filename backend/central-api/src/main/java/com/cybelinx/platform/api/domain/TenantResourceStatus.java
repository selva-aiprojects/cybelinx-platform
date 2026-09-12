package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "TenantResourceStatus". */
public enum TenantResourceStatus {
    PENDING,
    PROVISIONING,
    ACTIVE,
    SUSPENDED,
    DEGRADED,
    FAILED,
    RETIRED
}