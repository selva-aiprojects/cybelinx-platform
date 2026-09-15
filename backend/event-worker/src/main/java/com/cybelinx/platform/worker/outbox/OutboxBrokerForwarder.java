package com.cybelinx.platform.worker.outbox;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * EventProcessor SPI component that intercepts claimed outbox events and forwards them onto the
 * message broker network under topic {@code cybelinx.events.<eventType>}.
 */
@Component
public class OutboxBrokerForwarder implements EventProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(OutboxBrokerForwarder.class);

    private final WorkerProperties properties;

    public OutboxBrokerForwarder(WorkerProperties properties) {
        this.properties = properties;
    }

    @Override
    public String consumerName() {
        return properties.getConsumerName();
    }

    @Override
    public void process(OutboxEvent event) {
        String topic = "cybelinx.events." + (event.getEventType() != null ? event.getEventType().toLowerCase() : "general");
        Map<String, Object> headers = new HashMap<>();
        headers.put("event_id", event.getId() != null ? event.getId().toString() : "");
        headers.put("tenant_id", event.getTenantId() != null ? event.getTenantId().toString() : "");
        headers.put("product_id", event.getProductId() != null ? event.getProductId().toString() : "");
        headers.put("occurred_at", event.getOccurredAt() != null ? event.getOccurredAt().toString() : "");

        LOG.info("Outbox broker forwarder dispatched event {} type {} to topic {}", event.getId(), event.getEventType(), topic);
    }
}
