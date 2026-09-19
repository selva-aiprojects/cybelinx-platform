package com.cybelinx.platform.api.subscriptions.dto;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import jakarta.validation.constraints.NotNull;

/** Target status for {@code PATCH /subscriptions/{tenantProductId}/status}. */
public class UpdateSubscriptionStatusRequest {

    @NotNull(message = "status is required")
    private TenantProductStatus status;

    public TenantProductStatus getStatus() {
        return status;
    }

    public void setStatus(TenantProductStatus status) {
        this.status = status;
    }
}