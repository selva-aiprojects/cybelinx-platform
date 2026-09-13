package com.cybelinx.platform.api.plans.dto;

import com.cybelinx.platform.api.domain.PlanStatus;
import jakarta.validation.constraints.NotNull;

/** Target status for {@code PATCH /products/{productId}/plans/{planId}/status}. */
public class UpdatePlanStatusRequest {

    @NotNull(message = "status must be one of DRAFT, ACTIVE or RETIRED")
    private PlanStatus status;

    public PlanStatus getStatus() {
        return status;
    }

    public void setStatus(PlanStatus status) {
        this.status = status;
    }
}