package com.cybelinx.platform.worker.outbox;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;

/** Port of the outbox consumer scaffolding: the configured consumer name drives idempotency keys. */
class DefaultEventProcessorTest {

    @Test
    void exposesConfiguredConsumerName() {
        WorkerProperties properties = new WorkerProperties();
        properties.setConsumerName("test-consumer");

        DefaultEventProcessor processor = new DefaultEventProcessor(properties);

        assertThat(processor.consumerName()).isEqualTo("test-consumer");
        assertThat(processor.supports("any.event.type")).isTrue();
    }

    @Test
    void processingAScaffoldEventSucceeds() {
        WorkerProperties properties = new WorkerProperties();
        DefaultEventProcessor processor = new DefaultEventProcessor(properties);

        OutboxEvent event = new OutboxEvent();
        event.setEventType("tenant.created");

        assertThatCode(() -> processor.process(event)).doesNotThrowAnyException();
    }
}