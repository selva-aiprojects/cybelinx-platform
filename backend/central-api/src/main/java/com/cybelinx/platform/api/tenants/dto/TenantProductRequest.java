package com.cybelinx.platform.api.tenants.dto;

import com.cybelinx.platform.api.common.validation.OneOf;
import com.cybelinx.platform.api.tenants.TenantConstants;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Port of {@code TenantProductRequestDto}. */
public class TenantProductRequest {

    @OneOf(
            value = {"JIOPLIX", "JIOPLIX_SMART", "LIMS", "STOREAI", "SYNTHALYST_HRM"},
            message = "productCode must be one of the following values: "
                    + "JIOPLIX, JIOPLIX_SMART, LIMS, STOREAI, SYNTHALYST_HRM")
    private String productCode;

    @Size(max = 64, message = "planCode must not exceed 64 characters")
    private String planCode;

    @Valid
    private TenantResourceRequest resource;

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

    public TenantResourceRequest getResource() {
        return resource;
    }

    public void setResource(TenantResourceRequest resource) {
        this.resource = resource;
    }
}