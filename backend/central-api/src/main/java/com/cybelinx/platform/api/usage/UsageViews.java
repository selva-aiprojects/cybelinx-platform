package com.cybelinx.platform.api.usage;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** HTTP response and request projections for the usage/metering API. */
public final class UsageViews {

    public record IngestUsageRequest(
            String productCode,
            String eventType,
            BigDecimal quantity,
            String unit,
            String dedupeKey,
            String occurredAt,
            Map<String, Object> metadata) {}

    public record UsageEventView(
            String usageEventId,
            String tenantId,
            String productId,
            String eventType,
            BigDecimal quantity,
            String unit,
            String dedupeKey,
            String occurredAt,
            String ingestedAt) {}

    public record UsageListResponse(List<UsageEventView> data, Meta meta) {}

    public record Meta(int page, int limit, long total, long totalPages) {}

    public record IngestResponse(String usageEventId, String status) {}

    private UsageViews() {}
}
