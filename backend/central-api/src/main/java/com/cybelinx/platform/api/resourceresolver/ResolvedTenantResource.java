package com.cybelinx.platform.api.resourceresolver;

import java.util.UUID;

/**
 * Resolved, trusted runtime metadata for a tenant's resource. Products never
 * construct database/schema information themselves — they ask the resolver.
 */
public final class ResolvedTenantResource {

    private final UUID tenantId;
    private final UUID productId;
    private final UUID resourceId;
    private final String resourceTypeCode;
    private final String isolationMode;
    private final String databaseName;
    private final String databaseEndpoint;
    private final Integer databasePort;
    private final String schemaName;
    private final String regionCode;
    private final String credentialReference;

    public ResolvedTenantResource(
            UUID tenantId,
            UUID productId,
            UUID resourceId,
            String resourceTypeCode,
            String isolationMode,
            String databaseName,
            String databaseEndpoint,
            Integer databasePort,
            String schemaName,
            String regionCode,
            String credentialReference) {
        this.tenantId = tenantId;
        this.productId = productId;
        this.resourceId = resourceId;
        this.resourceTypeCode = resourceTypeCode;
        this.isolationMode = isolationMode;
        this.databaseName = databaseName;
        this.databaseEndpoint = databaseEndpoint;
        this.databasePort = databasePort;
        this.schemaName = schemaName;
        this.regionCode = regionCode;
        this.credentialReference = credentialReference;
    }

    public UUID tenantId() {
        return tenantId;
    }

    public UUID productId() {
        return productId;
    }

    public UUID resourceId() {
        return resourceId;
    }

    public String resourceTypeCode() {
        return resourceTypeCode;
    }

    public String isolationMode() {
        return isolationMode;
    }

    public String databaseName() {
        return databaseName;
    }

    public String databaseEndpoint() {
        return databaseEndpoint;
    }

    public Integer databasePort() {
        return databasePort;
    }

    public String schemaName() {
        return schemaName;
    }

    public String regionCode() {
        return regionCode;
    }

    public String credentialReference() {
        return credentialReference;
    }
}