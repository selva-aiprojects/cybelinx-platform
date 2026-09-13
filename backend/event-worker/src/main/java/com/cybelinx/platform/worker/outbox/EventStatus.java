package com.cybelinx.platform.worker.outbox;

/** Local mirror of the shared PostgreSQL {@code eventstatus} enum (V2 lowercase). */
public enum EventStatus {
    PENDING,
    PROCESSING,
    SUCCEEDED,
    FAILED,
    DEAD_LETTERED
}