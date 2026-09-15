package com.cybelinx.platform.api.broker;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Thread-safe In-Memory Message Broker implementation with Pub/Sub topic routing for dev/test environments.
 */
@Component
public class InMemoryMessageBroker implements MessageBroker {

    private static final Logger LOG = LoggerFactory.getLogger(InMemoryMessageBroker.class);

    private final Map<String, List<MessageListener>> topicSubscribers = new ConcurrentHashMap<>();
    private final AtomicLong publishedCounter = new AtomicLong(0);

    @Override
    public String brokerMode() {
        return "IN_MEMORY";
    }

    @Override
    public void publish(String topic, String routingKey, Map<String, Object> headers, Object payload) {
        publishedCounter.incrementAndGet();
        LOG.info("Broker message published -> Topic: {}, RoutingKey: {}, Payload: {}", topic, routingKey, payload);

        List<MessageListener> listeners = topicSubscribers.get(topic);
        if (listeners != null) {
            for (MessageListener listener : listeners) {
                try {
                    listener.onMessage(topic, routingKey, headers, payload);
                } catch (Exception ex) {
                    LOG.error("Error in message broker listener for topic {}", topic, ex);
                }
            }
        }
    }

    @Override
    public void subscribe(String topic, MessageListener listener) {
        topicSubscribers.computeIfAbsent(topic, t -> new CopyOnWriteArrayList<>()).add(listener);
        LOG.info("Subscribed new listener to topic: {}", topic);
    }

    @Override
    public BrokerStatus status() {
        long subscriberCount = topicSubscribers.values().stream().mapToLong(List::size).sum();
        return new BrokerStatus("IN_MEMORY", true, publishedCounter.get(), subscriberCount);
    }
}
