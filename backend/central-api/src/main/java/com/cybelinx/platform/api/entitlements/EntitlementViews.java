package com.cybelinx.platform.api.entitlements;

import java.util.List;
import java.util.Map;

/** Response contracts for plan entitlements (feature grants / limits). */
public final class EntitlementViews {

    public record EntitlementView(
            String entitlementId,
            String key,
            String name,
            Map<String, Object> value,
            String status,
            String createdAt,
            String updatedAt) {}

    public record EntitlementListResponse(List<EntitlementView> data) {}

    public record EntitlementActionResponse(String entitlementId, String status) {}

    private EntitlementViews() {
    }
}