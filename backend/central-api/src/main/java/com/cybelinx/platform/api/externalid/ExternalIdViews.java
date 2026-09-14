package com.cybelinx.platform.api.externalid;

import java.util.List;

/** HTTP projections for the tenant external-identifier mapping API. */
public final class ExternalIdViews {

    public record RegisterExternalIdRequest(
            String productCode,
            String provider,
            String externalId) {}

    public record ExternalIdView(
            String externalIdentifierId,
            String tenantId,
            String productId,
            String productCode,
            String provider,
            String externalId,
            String createdAt) {}

    public record ExternalIdListResponse(List<ExternalIdView> data) {}

    public record ExternalIdActionResponse(String externalIdentifierId, String tenantId, String status) {}

    private ExternalIdViews() {}
}
