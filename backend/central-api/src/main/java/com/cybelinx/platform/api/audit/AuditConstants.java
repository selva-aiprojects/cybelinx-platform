package com.cybelinx.platform.api.audit;

/** Permissions and constants for the audit API. */
public final class AuditConstants {

    public static final String PERMISSION_AUDIT_READ = "platform:read";

    /** Sort keys accepted by {@code GET /audit}. */
    public static final String[] SORT_KEYS = {"occurredAt", "-occurredAt"};

    public static final String DEFAULT_SORT = "-occurredAt";

    private AuditConstants() {}
}
