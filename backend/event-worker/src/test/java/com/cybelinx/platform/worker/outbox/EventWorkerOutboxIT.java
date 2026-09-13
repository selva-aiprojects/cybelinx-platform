package com.cybelinx.platform.worker.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration coverage for Cap-15–18 (outbox consumption loop). Seeds rows in the shared
 * {@code platform_events}/{@code event_processing} tables and drives {@link OutboxPollingService}
 * exactly as the worker does every {@code poll-interval-ms} tick:
 * claim → process → {@code SUCCEEDED}; idempotent skip of completed consumers; release + re-delivery
 * of lapsed leases (TRD §18 at-least-once/lease semantics).
 */
@SpringBootTest
@Transactional
class EventWorkerOutboxIT {

    @Autowired private OutboxEventRepository events;
    @Autowired private OutboxEventClaimRepository claims;
    @Autowired private OutboxPollingService worker;

    @Autowired private WorkerProperties properties;

    private OutboxEvent seed(EventStatus status, LocalDateTime availableAt, int attempts) {
        OutboxEvent event = new OutboxEvent();
        event.setEventType("tenant.created");
        event.setSchemaVersion("1.0");
        event.setTenantId(UUID.randomUUID());
        event.setEntityType("tenant");
        event.setEntityId(UUID.randomUUID());
        event.setCorrelationId(UUID.randomUUID().toString());
        event.setStatus(status);
        event.setAvailableAt(availableAt);
        event.setAttempts(attempts);
        return events.save(event);
    }

    @Test
    void poll_claimsAndCompletesPendingEvent() {
        OutboxEvent seeded = seed(EventStatus.PENDING, null, 0);

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(seeded.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getProcessedAt()).isNotNull();
        assertThat(refreshed.getAttempts()).isEqualTo(1);

        OutboxEventClaim claim = claims
                .findByEventIdAndConsumerName(seeded.getId(), properties.getConsumerName())
                .orElseThrow();
        assertThat(claim.getCompletedAt()).isNotNull();
        assertThat(claim.getAttemptCount()).isEqualTo(1);
        assertThat(claim.getLastError()).isNull();
    }

    @Test
    void poll_skipsEventAlreadyCompletedByConsumer() {
        OutboxEvent event = seed(EventStatus.PENDING, null, 0);
        claims.save(claimFor(event, now().plusSeconds(3600), now()));

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(event.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.PENDING);
        assertThat(refreshed.getAttempts()).isZero();
        assertThat(claims
                        .findByEventIdAndConsumerName(event.getId(), properties.getConsumerName())
                        .orElseThrow()
                        .getCompletedAt())
                .isNotNull();
    }

    @Test
    void poll_releasesExpiredLeaseAndRedeliversEvent() {
        OutboxEvent event = seed(EventStatus.PROCESSING, null, 1);
        claims.save(claimFor(event, now().minusSeconds(30), null));

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(event.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getAttempts()).isEqualTo(2);
        assertThat(claims
                        .findByEventIdAndConsumerName(event.getId(), properties.getConsumerName())
                        .orElseThrow()
                        .getAttemptCount())
                .isEqualTo(2);
    }

    @Test
    void poll_reprocessesFailedEventWhoseRetryIsDue() {
        OutboxEvent event = seed(EventStatus.FAILED, now(), 0);

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(event.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getAttempts()).isEqualTo(1);
        assertThat(claims
                        .findByEventIdAndConsumerName(event.getId(), properties.getConsumerName())
                        .orElseThrow()
                        .getCompletedAt())
                .isNotNull();
    }

    @Test
    void poll_skipsEventWhoseRetryIsNotYetDue() {
        OutboxEvent event = seed(EventStatus.FAILED, now().plusSeconds(300), 0);

        worker.pollOnce();

        assertThat(events.findById(event.getId()).orElseThrow().getStatus())
                .isEqualTo(EventStatus.FAILED);
        assertThat(claims.findByEventIdAndConsumerName(event.getId(), properties.getConsumerName()))
                .isEmpty();
    }

    @Test
    void poll_skipsPendingEventWhoseAvailabilityIsInTheFuture() {
        OutboxEvent event = seed(EventStatus.PENDING, now().plusSeconds(300), 0);

        worker.pollOnce();

        assertThat(events.findById(event.getId()).orElseThrow().getStatus())
                .isEqualTo(EventStatus.PENDING);
        assertThat(claims.findByEventIdAndConsumerName(event.getId(), properties.getConsumerName()))
                .isEmpty();
    }

    private LocalDateTime now() {
        return LocalDateTime.now();
    }

    private OutboxEventClaim claimFor(OutboxEvent event, LocalDateTime lease, LocalDateTime completed) {
        OutboxEventClaim claim = new OutboxEventClaim();
        claim.setEventId(event.getId());
        claim.setConsumerName(properties.getConsumerName());
        claim.setWorkerId("test-worker");
        claim.setClaimedAt(now());
        claim.setLeaseExpiresAt(lease);
        claim.setAttemptCount(1);
        claim.setCompletedAt(completed);
        return claims.save(claim);
    }
}