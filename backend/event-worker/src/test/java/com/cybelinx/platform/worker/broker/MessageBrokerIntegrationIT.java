package com.cybelinx.platform.worker.broker;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.worker.outbox.OutboxBrokerForwarder;
import com.cybelinx.platform.worker.outbox.OutboxEvent;
import com.cybelinx.platform.worker.outbox.WorkerProperties;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Tests for outbox event broker forwarding pipeline. */
class MessageBrokerIntegrationIT {

    @Test
    void outboxBrokerForwarder_processesEventWithoutErrors() {
        WorkerProperties properties = new WorkerProperties();
        properties.setConsumerName("broker-forwarder-test");

        OutboxBrokerForwarder forwarder = new OutboxBrokerForwarder(properties);

        assertThat(forwarder.consumerName()).isEqualTo("broker-forwarder-test");

        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        event.setEventType("TENANT_CREATED");
        event.setTenantId(UUID.randomUUID());
        event.setProductId(UUID.randomUUID());
        event.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));

        forwarder.process(event);
    }
}
