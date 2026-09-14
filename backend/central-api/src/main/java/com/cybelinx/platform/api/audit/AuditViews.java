package com.cybelinx.platform.api.audit;

import java.util.List;

/** HTTP response projections for the audit log API. */
public final class AuditViews {

    public record AuditEventView(
            String id,
            String tenantId,
            String userId,
            String productId,
            String actorType,
            String action,
            String entityType,
            String entityId,
            String metadata,
            String ipAddress,
            String requestId,
            String occurredAt) {}

    public record AuditListResponse(List<AuditEventView> data, Meta meta) {}

    public record Meta(int page, int limit, long total, long totalPages) {}

    private AuditViews() {}
}
