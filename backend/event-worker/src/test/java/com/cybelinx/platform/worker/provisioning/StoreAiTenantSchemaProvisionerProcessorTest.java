package com.cybelinx.platform.worker.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cybelinx.platform.worker.outbox.OutboxEvent;
import com.cybelinx.platform.worker.outbox.WorkerProperties;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;

class StoreAiTenantSchemaProvisionerProcessorTest {

    private WorkerProperties properties;
    private JdbcTemplate targetJdbcTemplate;
    private TargetDatabaseConnectionResolver connectionResolver;
    private StoreAiTenantSchemaProvisionerProcessor processor;

    @BeforeEach
    void setUp() {
        properties = new WorkerProperties();
        properties.setConsumerName("test-worker-consumer");
        targetJdbcTemplate = Mockito.mock(JdbcTemplate.class);
        connectionResolver = Mockito.mock(TargetDatabaseConnectionResolver.class);
        when(connectionResolver.resolveTargetJdbcTemplate(anyString(), anyString(), Mockito.nullable(String.class)))
                .thenReturn(targetJdbcTemplate);
        processor = new StoreAiTenantSchemaProvisionerProcessor(properties, connectionResolver);
    }

    @Test
    void supportsCorrectEventTypes() {
        assertThat(processor.supports("TENANT_CREATED")).isTrue();
        assertThat(processor.supports("TENANT_EXTERNAL_ID_REGISTERED")).isTrue();
        assertThat(processor.supports("TENANT_PRODUCT_ATTACHED")).isTrue();
        assertThat(processor.supports("UNKNOWN_EVENT")).isFalse();
    }

    @Test
    void process_shouldExecuteDynamicPostgresDdlForStoreAiTenant() {
        OutboxEvent event = new OutboxEvent();
        event.setTenantId(UUID.randomUUID());
        event.setEventType("TENANT_CREATED");
        event.setPayload(Map.of(
                "productCode", "STOREAI",
                "tenantCode", "STORE_NIKE_01",
                "provider", "STOREAI_NEXUS"
        ));

        processor.process(event);

        verify(targetJdbcTemplate, atLeastOnce()).execute(anyString());
    }
}
