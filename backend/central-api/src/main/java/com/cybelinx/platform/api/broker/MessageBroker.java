package com.cybelinx.platform.api.broker;

import java.util.Map;

/**
 * Message Broker SPI interface for real-time inter-service communication and event distribution
 * (supporting In-Memory, RabbitMQ AMQP, and Apache Kafka).
 */
public interface MessageBroker {

    /** Mode/type identifier for the active message broker engine. */
    String brokerMode();

    /** Publish a message onto a topic/queue with routing key and headers. */
    void publish(String topic, String routingKey, Map<String, Object> headers, Object payload);

    /** Subscribe a listener function to a topic. */
    void subscribe(String topic, MessageListener listener);

    /** Health and connection status of the broker. */
    BrokerStatus status();

    @FunctionalInterface
    interface MessageListener {
        void onMessage(String topic, String routingKey, Map<String, Object> headers, Object payload);
    }

    record BrokerStatus(String mode, boolean connected, long totalPublished, long totalSubscribers) {}
}
