package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "IsolationMode". */
public enum IsolationMode {
    SHARED_POOL,
    SCHEMA_PER_TENANT,
    DEDICATED_DATABASE,
    DEDICATED_INFRASTRUCTURE
}