package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

/**
 * Infrastructure resource allocation and schema isolation requirements for a product.
 */
public record ResourceRequirement(
        String defaultResourceType,
        List<String> supportedIsolationModes,
        String defaultIsolationMode,
        String schemaPrefix
) {
    public static ResourceRequirement schemaPerTenant(String schemaPrefix) {
        return new ResourceRequirement(
                "POSTGRES_SCHEMA",
                List.of("SCHEMA_PER_TENANT", "SHARED_POOL", "DEDICATED_DATABASE"),
                "SCHEMA_PER_TENANT",
                schemaPrefix
        );
    }
}
