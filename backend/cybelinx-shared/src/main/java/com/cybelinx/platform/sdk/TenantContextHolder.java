package com.cybelinx.platform.sdk;

import java.util.Optional;

/**
 * ThreadLocal container propagating tenant context across product microservice operations.
 */
public final class TenantContextHolder {

    public record TenantContext(String tenantId, String tenantCode, String userPrincipal) {}

    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

    private TenantContextHolder() {}

    public static void setContext(String tenantId, String tenantCode, String userPrincipal) {
        CONTEXT.set(new TenantContext(tenantId, tenantCode, userPrincipal));
    }

    public static Optional<TenantContext> getContext() {
        return Optional.ofNullable(CONTEXT.get());
    }

    public static String getTenantId() {
        return getContext().map(TenantContext::tenantId).orElse(null);
    }

    public static String getTenantCode() {
        return getContext().map(TenantContext::tenantCode).orElse(null);
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
