package com.cybelinx.platform.api.storageisolation;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.security.AuthPrincipal;
import java.util.UUID;

/**
 * Enforcement boundary for storage isolation (TRD §13 / §13.1). Resolves the
 * tenant's trusted runtime metadata and derives the least-privilege connection
 * context a product may use — including the pooled {@code search_path} contract:
 * the {@code SET} is connection/transaction-scoped and paired with a
 * {@code RESET} ({@link RuntimeConnectionContext#searchPathResetCommand}) that
 * MUST run before the pooled connection is returned, so a connection that served
 * Tenant A never retains Tenant A's schema when later serving Tenant B.
 */
public interface StorageIsolationEnforcer {

    RuntimeConnectionContext enforce(
            AuthPrincipal principal,
            UUID tenantId,
            UUID productId,
            Environment environment);
}
