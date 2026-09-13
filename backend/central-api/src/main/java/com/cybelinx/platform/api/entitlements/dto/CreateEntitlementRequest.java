package com.cybelinx.platform.api.entitlements.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;

/** New feature grant / limit on a plan. {@code value} is a structured JSON object. */
public class CreateEntitlementRequest {

    @NotNull(message = "key is required")
    @Pattern(
            regexp = "^[a-z][a-z0-9_.:-]{1,127}$",
            message = "key must be lowercase letters, digits, dots, underscores, colons or hyphens")
    private String key;

    @Size(max = 120, message = "name must not exceed 120 characters")
    private String name;

    @NotNull(message = "value must be a structured value object")
    private Map<String, Object> value;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, Object> getValue() {
        return value;
    }

    public void setValue(Map<String, Object> value) {
        this.value = value;
    }
}