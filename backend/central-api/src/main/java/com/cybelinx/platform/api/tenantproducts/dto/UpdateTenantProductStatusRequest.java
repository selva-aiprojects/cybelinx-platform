package com.cybelinx.platform.api.tenantproducts.dto;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import jakarta.validation.constraints.NotNull;

/** Target status for {@code PATCH /tenants/{tenantId}/products/{productId}/status}. */
public class UpdateTenantProductStatusRequest {

    @NotNull(message = "status must be one of PROVISIONING, ACTIVE, SUSPENDED, LAPSED or DISABLED")
    private TenantProductStatus status;

    public TenantProductStatus getStatus() {
        return status;
    }

    public void setStatus(TenantProductStatus status) {
        this.status = status;
    }
}