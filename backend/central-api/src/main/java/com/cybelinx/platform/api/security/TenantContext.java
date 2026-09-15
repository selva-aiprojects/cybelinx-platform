package com.cybelinx.platform.api.security;

import java.util.Optional;
import java.util.UUID;

/**
 * Thread-local context holder enforcing explicit tenant security boundaries per request thread.
 * Prevents cross-tenant data access leakage in accordance with SOC 2 Type II and ISO 27001 standards.
 */
public final class TenantContext {

    private static final ThreadLocal<TenantBoundary> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public record TenantBoundary(UUID tenantId, String tenantCode, String isolationMode) {}

    public static void set(UUID tenantId, String tenantCode, String isolationMode) {
        CURRENT_TENANT.set(new TenantBoundary(tenantId, tenantCode, isolationMode));
    }

    public static Optional<TenantBoundary> get() {
        return Optional.ofNullable(CURRENT_TENANT.get());
    }

    public static Optional<UUID> getTenantId() {
        return get().map(TenantBoundary::tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
