package com.cybelinx.platform.sdk;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Logger;

/**
 * High-performance, thread-safe asynchronous metering client for product microservices
 * to batch and report resource usage telemetry to Cybelinx Central Platform.
 */
public class MeteringClient {

    private static final Logger log = Logger.getLogger(MeteringClient.class.getName());

    public record UsageTelemetryEvent(
            String tenantId,
            String productCode,
            String metricCode,
            BigDecimal quantity,
            String unit,
            String deduplicationId,
            Map<String, Object> metadata
    ) {}

    private final String centralControlPlaneUrl;
    private final Map<String, AtomicLong> usageBuffer = new ConcurrentHashMap<>();

    public MeteringClient(String centralControlPlaneUrl) {
        this.centralControlPlaneUrl = centralControlPlaneUrl;
    }

    public void recordMetric(String tenantId, String productCode, String metricCode, long quantity) {
        String key = tenantId + ":" + productCode + ":" + metricCode;
        usageBuffer.computeIfAbsent(key, k -> new AtomicLong(0)).addAndGet(quantity);
        log.fine(() -> "Recorded telemetry metric " + key + " = " + quantity + " to buffer for control plane: " + centralControlPlaneUrl);
    }

    public UsageTelemetryEvent buildEvent(String tenantId, String productCode, String metricCode, BigDecimal quantity, String unit, String dedupeId) {
        return new UsageTelemetryEvent(tenantId, productCode, metricCode, quantity, unit, dedupeId, Map.of("source", "CybelinxProductSDK"));
    }

    public Map<String, AtomicLong> getUsageBuffer() {
        return usageBuffer;
    }
}
