package com.cybelinx.platform.api.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/**
 * Micrometer metrics instrumentation for multi-tenant SaaS operations.
 */
@Component
public class TenantPlatformMetrics {

    private final MeterRegistry registry;

    public TenantPlatformMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordTenantProvisioned(String tenantCode, long durationMs) {
        Counter.builder("tenant.provisioning.total")
                .tag("tenant_code", tenantCode)
                .tag("status", "SUCCESS")
                .description("Total number of successfully provisioned tenants")
                .register(registry)
                .increment();

        Timer.builder("tenant.provisioning.duration")
                .tag("tenant_code", tenantCode)
                .description("Duration of tenant schema provisioning pipeline")
                .register(registry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordUsageIngested(String productCode, String metricCode, double amount) {
        Counter.builder("tenant.usage.events.total")
                .tag("product_code", productCode)
                .tag("metric_code", metricCode)
                .description("Total metered usage events ingested")
                .register(registry)
                .increment(amount);
    }
}
