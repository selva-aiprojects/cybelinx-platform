package com.cybelinx.platform.api.plans;

import java.util.List;

/** Response contracts for product plans. */
public final class PlanViews {

    public record PlanView(
            String planId,
            String planCode,
            String name,
            String description,
            String status,
            Integer trialDays,
            String createdAt,
            String updatedAt) {}

    public record PlanListResponse(List<PlanView> data) {}

    public record PlanActionResponse(String planId, String status) {}

    private PlanViews() {
    }
}