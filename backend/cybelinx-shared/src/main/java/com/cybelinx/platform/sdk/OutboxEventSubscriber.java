package com.cybelinx.platform.sdk;

import java.util.Map;

/**
 * Event listener interface implemented by product services to receive platform outbox lifecycle events
 * (TENANT_CREATED, TENANT_SUSPENDED, SCHEMA_PROVISIONED).
 */
@FunctionalInterface
public interface OutboxEventSubscriber {

    record ProvisioningLifecycleEvent(
            String eventId,
            String eventType,
            String tenantId,
            String tenantCode,
            String timestamp,
            Map<String, Object> payload
    ) {}

    void onEvent(ProvisioningLifecycleEvent event);
}
