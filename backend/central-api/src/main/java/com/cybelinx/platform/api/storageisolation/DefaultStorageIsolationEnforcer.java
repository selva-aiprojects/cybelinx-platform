package com.cybelinx.platform.api.storageisolation;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.RuntimeRole;
import com.cybelinx.platform.api.resourceresolver.ResolvedTenantResource;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.tenantresources.TenantResourcesService;
import java.util.UUID;

/**
 * Default {@link StorageIsolationEnforcer}. Authorization and physical
 * resolution are delegated to the trusted Cap-9 resolver — products never
 * construct database/schema information themselves (TRD §13). This type only
 * derives the least-privilege {@link RuntimeRole} and, for schema-per-tenant,
 * the pooled {@code search_path} contract: {@code SET search_path} is
 * connection/transaction-scoped and paired with a {@code RESET} that MUST run
 * before the pooled connection is returned, so Tenant A's schema is never
 * retained when the connection later serves Tenant B (TRD §13.1).
 */
public final class DefaultStorageIsolationEnforcer implements StorageIsolationEnforcer {

    private final TenantResourcesService tenantResources;

    public DefaultStorageIsolationEnforcer(TenantResourcesService tenantResources) {
        this.tenantResources = tenantResources;
    }

    @Override
    public RuntimeConnectionContext enforce(
            AuthPrincipal principal, UUID tenantId, UUID productId, Environment environment) {
        ResolvedTenantResource resolved =
                tenantResources.resolveResource(principal, tenantId, productId, environment);

        boolean schemaScoped = "SCHEMA_PER_TENANT".equals(resolved.isolationMode());
        String schema = schemaScoped ? resolved.schemaName() : null;

        return new RuntimeConnectionContext(
                resolved.tenantId(),
                resolved.productId(),
                resolved.resourceId(),
                resolved.resourceTypeCode(),
                resolved.isolationMode(),
                environment,
                resolved.databaseName(),
                resolved.databaseEndpoint(),
                resolved.databasePort(),
                schema,
                runtimeRoleFor(resolved.isolationMode()),
                schemaScoped ? searchPathSet(schema) : null,
                schemaScoped ? "RESET search_path" : null,
                resolved.regionCode(),
                resolved.credentialReference());
    }

    /** TRD §13: least-privilege role per isolation model. */
    private static RuntimeRole runtimeRoleFor(String isolationMode) {
        return switch (isolationMode) {
            case "SHARED_POOL" -> RuntimeRole.PRODUCT_RUNTIME;
            case "SCHEMA_PER_TENANT" -> RuntimeRole.TENANT_SCHEMA_OWNER;
            case "DEDICATED_DATABASE" -> RuntimeRole.PRODUCT_RUNTIME;
            case "DEDICATED_INFRASTRUCTURE" -> RuntimeRole.PRODUCT_RUNTIME;
            default -> throw new IllegalStateException(
                    "unknown isolation mode: " + isolationMode);
        };
    }

    /** {@code SET search_path = "<schema>", public} with identifier quoting. */
    private static String searchPathSet(String schema) {
        String quoted = "\"" + schema.replace("\"", "\"\"") + "\"";
        return "SET search_path = " + quoted + ", public";
    }
}
