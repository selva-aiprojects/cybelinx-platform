package com.cybelinx.platform.api.subscriptions.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

/** Create a master subscription for a tenant. */
public class CreateSubscriptionRequest {

    @NotNull(message = "tenantId is required")
    private UUID tenantId;

    @NotNull(message = "productCode is required")
    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "productCode must be uppercase letters, digits or \"_\"")
    private String productCode;

    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "planCode must be uppercase letters, digits or \"_\"")
    private String planCode;

    private String appUrl;

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getAppUrl() {
        return appUrl;
    }

    public void setAppUrl(String appUrl) {
        this.appUrl = appUrl;
    }
}