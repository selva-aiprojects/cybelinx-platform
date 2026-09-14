package com.cybelinx.platform.api.events;

import com.cybelinx.platform.api.domain.EventStatus;
import com.cybelinx.platform.api.persistence.PlatformEventRepository;
import com.cybelinx.platform.api.persistence.entity.PlatformEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transactional outbox producer: appends {@code platform_events} rows in the same transaction as
 * the business write that caused them (TRD section 19/20). The event worker exclusively takes over
 * from {@code PENDING}; in-flight consumers are idempotent via {@code (event_id, consumer_name)}.
 */
@Service
public class OutboxPublisher {

    public static final String TENANT_CREATED = "TENANT_CREATED";
    public static final String TENANT_PROVISIONED = "TENANT_PROVISIONED";
    public static final String TENANT_ACTIVATED = "TENANT_ACTIVATED";
    public static final String TENANT_SUSPENDED = "TENANT_SUSPENDED";
    public static final String TENANT_DEACTIVATED = "TENANT_DEACTIVATED";
    public static final String TENANT_DELETED = "TENANT_DELETED";
    public static final String PRODUCT_ENABLED = "PRODUCT_ENABLED";
    public static final String PRODUCT_DISABLED = "PRODUCT_DISABLED";
    public static final String RESOURCE_CREATED = "RESOURCE_CREATED";
    public static final String RESOURCE_PROVISIONED = "RESOURCE_PROVISIONED";
    public static final String RESOURCE_FAILED = "RESOURCE_FAILED";

    public static final String SOURCE_CONTROL_PLANE = "control-plane";

    private final PlatformEventRepository events;

    public OutboxPublisher(PlatformEventRepository events) {
        this.events = events;
    }

    @Transactional
    public PlatformEvent publish(
            String eventType,
            Tenant tenant,
            Product product,
            String entityType,
            UUID entityId,
            String source,
            Map<String, Object> payload) {
        PlatformEvent event = new PlatformEvent();
        event.setEventType(eventType);
        event.setSchemaVersion("1.0");
        event.setTenant(tenant);
        event.setProduct(product);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setSource(source != null ? source : SOURCE_CONTROL_PLANE);
        event.setCorrelationId(UUID.randomUUID().toString());
        event.setAggregateId(tenant != null ? tenant.getId() : entityId);
        event.setPayload(payload);
        event.setStatus(EventStatus.PENDING);
        event.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        event.setAvailableAt(LocalDateTime.now(ZoneOffset.UTC));
        return events.save(event);
    }

    @Transactional
    public PlatformEvent publishTenantEvent(String eventType, Tenant tenant, Map<String, Object> payload) {
        return publish(eventType, tenant, null, "tenant", tenant.getId(), SOURCE_CONTROL_PLANE, payload);
    }

    @Transactional
    public PlatformEvent publishProvisioningEvent(
            String eventType, Tenant tenant, Product product, UUID resourceId, Map<String, Object> payload) {
        return publish(
                eventType, tenant, product, "resource", resourceId != null ? resourceId : tenant.getId(),
                SOURCE_CONTROL_PLANE, payload);
    }

    @Transactional
    public PlatformEvent publishProductEvent(
            String eventType, Tenant tenant, Product product, UUID tenantProductId, Map<String, Object> payload) {
        return publish(eventType, tenant, product, "tenant_product", tenantProductId, SOURCE_CONTROL_PLANE, payload);
    }

    @Transactional
    public PlatformEvent publishResourceEvent(
            String eventType, Tenant tenant, Product product, UUID resourceId, Map<String, Object> payload) {
        return publish(eventType, tenant, product, "tenant_resource", resourceId, SOURCE_CONTROL_PLANE, payload);
    }
}