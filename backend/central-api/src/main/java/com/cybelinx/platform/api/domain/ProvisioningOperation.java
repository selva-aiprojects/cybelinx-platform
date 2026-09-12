package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "ProvisioningOperation". */
public enum ProvisioningOperation {
    PROVISION,
    REPROVISION,
    UPGRADE,
    SUSPEND,
    RESUME,
    DEPROVISION
}