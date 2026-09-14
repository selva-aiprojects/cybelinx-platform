package com.cybelinx.platform.api.events;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.domain.EventStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.PlatformEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.PlatformEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** Integration tests for OutboxPublisher (Capability 28). */
@SpringBootTest
@Transactional
class OutboxPublisherIT {

    @Autowired private OutboxPublisher publisher;
    @Autowired private PlatformEventRepository events;
    @Autowired private TenantRepository tenants;
    @Autowired private ProductRepository products;

    private String suffix;
    private Tenant tenant;
    private Product product;

    @BeforeEach
    void setUp() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        tenant = new Tenant();
        tenant.setTenantCode("OUTBOX_" + suffix);
        tenant.setName("Outbox Test Tenant");
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant = tenants.save(tenant);

        product = new Product();
        product.setProductCode("OUTBOX_PROD_" + suffix);
        product.setName("Outbox Test Product");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);
    }

    @Test
    void publishTenantEvent_createsPendingPlatformEvent() {
        PlatformEvent event = publisher.publishTenantEvent(
                OutboxPublisher.TENANT_CREATED,
                tenant,
                Map.of("name", tenant.getName(), "code", tenant.getTenantCode()));

        assertThat(event.getId()).isNotNull();
        assertThat(event.getEventType()).isEqualTo(OutboxPublisher.TENANT_CREATED);
        assertThat(event.getTenant().getId()).isEqualTo(tenant.getId());
        assertThat(event.getStatus()).isEqualTo(EventStatus.PENDING);
        assertThat(event.getSchemaVersion()).isEqualTo("1.0");
        assertThat(event.getSource()).isEqualTo(OutboxPublisher.SOURCE_CONTROL_PLANE);
        assertThat(event.getPayload()).containsEntry("code", tenant.getTenantCode());

        // Verify persisted in DB
        PlatformEvent found = events.findById(event.getId()).orElseThrow();
        assertThat(found.getEventType()).isEqualTo(OutboxPublisher.TENANT_CREATED);
    }

    @Test
    void publishProductEvent_createsPendingPlatformEvent() {
        UUID tpId = UUID.randomUUID();
        PlatformEvent event = publisher.publishProductEvent(
                OutboxPublisher.PRODUCT_ENABLED,
                tenant,
                product,
                tpId,
                Map.of("productCode", product.getProductCode(), "status", "ACTIVE"));

        assertThat(event.getEventType()).isEqualTo(OutboxPublisher.PRODUCT_ENABLED);
        assertThat(event.getProduct().getId()).isEqualTo(product.getId());
        assertThat(event.getEntityType()).isEqualTo("tenant_product");
        assertThat(event.getEntityId()).isEqualTo(tpId);
    }

    @Test
    void publishResourceEvent_createsPendingPlatformEvent() {
        UUID resId = UUID.randomUUID();
        PlatformEvent event = publisher.publishResourceEvent(
                OutboxPublisher.RESOURCE_PROVISIONED,
                tenant,
                product,
                resId,
                Map.of("resourceId", resId.toString(), "status", "ACTIVE"));

        assertThat(event.getEventType()).isEqualTo(OutboxPublisher.RESOURCE_PROVISIONED);
        assertThat(event.getEntityType()).isEqualTo("tenant_resource");
        assertThat(event.getEntityId()).isEqualTo(resId);
    }
}
