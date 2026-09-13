package com.cybelinx.platform.api.entitlements.dto;

import com.cybelinx.platform.api.domain.EntitlementStatus;
import jakarta.validation.constraints.NotNull;

/** Target status for {@code PATCH .../entitlements/{entitlementId}/status}. */
public class UpdateEntitlementStatusRequest {

    @NotNull(message = "status must be one of PENDING, ACTIVE, INACTIVE or SUSPENDED")
    private EntitlementStatus status;

    public EntitlementStatus getStatus() {
        return status;
    }

    public void setStatus(EntitlementStatus status) {
        this.status = status;
    }
}