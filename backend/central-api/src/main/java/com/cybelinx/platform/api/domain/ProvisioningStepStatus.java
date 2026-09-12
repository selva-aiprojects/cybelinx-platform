package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "ProvisioningStepStatus". */
public enum ProvisioningStepStatus {
    PENDING,
    IN_PROGRESS,
    SUCCEEDED,
    FAILED,
    SKIPPED,
    CANCELLED
}