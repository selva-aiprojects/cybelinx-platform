package com.cybelinx.platform.api.domain;

/** PostgreSQL enum "EventStatus". */
public enum EventStatus {
    PENDING,
    PROCESSING,
    SUCCEEDED,
    FAILED,
    DEAD_LETTERED
}