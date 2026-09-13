package com.cybelinx.platform.api.resourceresolver;

import com.cybelinx.platform.api.domain.Environment;
import java.util.UUID;

/**
 * Resolves a tenant's resource from trusted platform metadata
 * ({@code tenant_resources}). Products must never guess database/schema names.
 */
public interface TenantResourceResolver {

    /**
     * Resolve the runtime resource for {@code (tenantId, productId, environment)}.
     *
     * @return the active resolved resource
     */
    ResolvedTenantResource resolve(UUID tenantId, UUID productId, Environment environment);
}