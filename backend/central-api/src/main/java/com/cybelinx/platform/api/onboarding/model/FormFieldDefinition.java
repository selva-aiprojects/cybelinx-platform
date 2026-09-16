package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

/**
 * Definition of a dynamic form field required or supported for onboarding into a specific product.
 */
public record FormFieldDefinition(
        String key,
        String label,
        String type,
        boolean required,
        String placeholder,
        String defaultValue,
        List<String> options,
        String hint
) {
    public static FormFieldDefinition text(String key, String label, boolean required, String placeholder, String hint) {
        return new FormFieldDefinition(key, label, "text", required, placeholder, null, List.of(), hint);
    }

    public static FormFieldDefinition email(String key, String label, boolean required, String placeholder, String hint) {
        return new FormFieldDefinition(key, label, "email", required, placeholder, null, List.of(), hint);
    }

    public static FormFieldDefinition url(String key, String label, boolean required, String placeholder, String hint) {
        return new FormFieldDefinition(key, label, "url", required, placeholder, null, List.of(), hint);
    }

    public static FormFieldDefinition select(String key, String label, boolean required, List<String> options, String defaultValue, String hint) {
        return new FormFieldDefinition(key, label, "select", required, null, defaultValue, options, hint);
    }
}
