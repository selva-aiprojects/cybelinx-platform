package com.cybelinx.platform.worker.outbox;

/**
 * Consumer SPI for outbox processing (TRD §17 event contract). Handlers are registered as
 * Spring beans and matched by {@link #consumerName()} so multiple consumers of the same
 * {@code platform_events} row remain idempotent via {@code event_processing(event_id, consumer_name)}.
 *
 * <p>Processing is at-least-once: a handler must be idempotent on the {@code event_id} because the
 * worker may re-deliver after a crash. Throw {@link RuntimeException} to trigger the retry/backoff
 * path (fail → {@code FAILED} + {@code available_at} → re-claim → {@code DEAD_LETTERED} after
 * {@code maxAttempts}).
 */
public interface EventProcessor {

    /** Stable consumer identity stored on each {@code event_processing} row. */
    String consumerName();

    /**
     * Process one claimed event.
     *
     * @throws RuntimeException any operational failure (triggers retry/backoff then dead-letter)
     */
    void process(OutboxEvent event);

    /** Filter whether this consumer should touch the given event type at all. */
    default boolean supports(String eventType) {
        return true;
    }
}