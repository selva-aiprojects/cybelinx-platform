package com.cybelinx.platform.api.tenantresources.dto;

import com.cybelinx.platform.api.common.validation.OneOf;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Register a resource for a product a tenant is subscribed to. */
public class RegisterTenantResourceRequest {

    @NotBlank(message = "productCode is required")
    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "productCode must be uppercase letters, digits or \"_\"")
    private String productCode;

    @NotBlank(message = "resourceTypeCode must be a string")
    @Size(max = 64, message = "resourceTypeCode must not exceed 64 characters")
    private String resourceTypeCode;

    @OneOf(
            value = {"SHARED_POOL", "SCHEMA_PER_TENANT", "DEDICATED_DATABASE", "DEDICATED_INFRASTRUCTURE"},
            message = "isolationMode must be one of the following values: "
                    + "SHARED_POOL, SCHEMA_PER_TENANT, DEDICATED_DATABASE, DEDICATED_INFRASTRUCTURE")
    private String isolationMode;

    @OneOf(
            value = {"DEVELOPMENT", "STAGING", "PRODUCTION"},
            message = "environment must be one of the following values: DEVELOPMENT, STAGING, PRODUCTION")
    private String environment;

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getResourceTypeCode() {
        return resourceTypeCode;
    }

    public void setResourceTypeCode(String resourceTypeCode) {
        this.resourceTypeCode = resourceTypeCode;
    }

    public String getIsolationMode() {
        return isolationMode;
    }

    public void setIsolationMode(String isolationMode) {
        this.isolationMode = isolationMode;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }
}