package com.cybelinx.platform.api.onboarding.model;

/**
 * Definition of the primary external tenant identifier used by the upstream product.
 */
public record TenantIdentifierDefinition(
        String key,
        String label,
        String placeholder,
        boolean required,
        String hint
) {
    public static TenantIdentifierDefinition of(String key, String label, String placeholder, String hint) {
        return new TenantIdentifierDefinition(key, label, placeholder, true, hint);
    }
}
