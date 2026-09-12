package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "ProvisioningState". */
public enum ProvisioningState {
    PENDING,
    IN_PROGRESS,
    SUCCEEDED,
    FAILED,
    CANCELLED,
    ROLLED_BACK
}