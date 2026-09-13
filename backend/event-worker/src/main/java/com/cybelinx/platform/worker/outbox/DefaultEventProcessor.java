package com.cybelinx.platform.worker.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Scaffold consumer bound to the configured {@code cybelinx.worker.consumer-name}. It accepts
 * every event type and completes the claim, proving the outbox loop end-to-end. Product-specific
 * handlers are added as additional {@link EventProcessor} beans (same consumer name, narrowed
 * {@link #supports(String)}).
 */
@Component
public class DefaultEventProcessor implements EventProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(DefaultEventProcessor.class);

    private final WorkerProperties properties;

    public DefaultEventProcessor(WorkerProperties properties) {
        this.properties = properties;
    }

    @Override
    public String consumerName() {
        return properties.getConsumerName();
    }

    @Override
    public void process(OutboxEvent event) {
        LOG.debug(
                "Default processor consumed event {} type {} for tenant {}",
                event.getId(),
                event.getEventType(),
                event.getTenantId());
    }
}