package com.cybelinx.platform.api.entitlements.dto;

import jakarta.validation.constraints.Size;
import java.util.Map;

/** Partial entitlement update (name/value optional). */
public class UpdateEntitlementRequest {

    @Size(max = 120, message = "name must not exceed 120 characters")
    private String name;

    private Map<String, Object> value;

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