package com.cybelinx.platform.worker.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
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
    @Autowired private JdbcTemplate jdbc;

    @Autowired private WorkerProperties properties;

    private String tenantCode;

    @BeforeEach
    void seedTenant() {
        tenantCode = "worker-" + UUID.randomUUID().toString().substring(0, 8).toLowerCase();
        jdbc.update(
                "insert into tenants (id, tenant_code, name, status, created_at, updated_at) "
                        + "values (?, ?, ?, ?::public.tenantstatus, now(), now())",
                UUID.randomUUID(),
                tenantCode,
                "Worker Outbox Test",
                "PROVISIONING");
    }

    private UUID seed(EventStatus status, LocalDateTime availableAt, int attempts) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                """
                insert into platform_events
                    (id, event_type, schema_version, tenant_id, entity_type, entity_id,
                     correlation_id, occurred_at, source, status, attempts, available_at,
                     created_at, updated_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::public.eventstatus, ?, ?, ?, ?)
                """,
                id,
                "tenant.created",
                "1.0",
                seededTenantId(),
                "tenant",
                UUID.randomUUID(),
                UUID.randomUUID().toString(),
                now().minusYears(1),
                "control-plane",
                status.name(),
                attempts,
                availableAt,
                now().minusYears(1),
                now().minusYears(1));
        return id;
    }

    private UUID seededTenantId() {
        return jdbc.queryForObject(
                "select id from tenants where tenant_code = ?", UUID.class, tenantCode);
    }

    @Test
    void poll_claimsAndCompletesPendingEvent() {
        UUID seededId = seed(EventStatus.PENDING, null, 0);

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(seededId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getProcessedAt()).isNotNull();
        assertThat(refreshed.getAttempts()).isEqualTo(1);

        OutboxEventClaim claim = claims
                .findByEventIdAndConsumerName(seededId, properties.getConsumerName())
                .orElseThrow();
        assertThat(claim.getCompletedAt()).isNotNull();
        assertThat(claim.getAttemptCount()).isEqualTo(1);
        assertThat(claim.getLastError()).isNull();
    }

    @Test
    void poll_skipsEventAlreadyCompletedByConsumer() {
        UUID eventId = seed(EventStatus.PENDING, null, 0);
        claims.save(claimFor(eventId, now().plusSeconds(3600), now()));

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(eventId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.PENDING);
        assertThat(refreshed.getAttempts()).isZero();
        assertThat(claims
                        .findByEventIdAndConsumerName(eventId, properties.getConsumerName())
                        .orElseThrow()
                        .getCompletedAt())
                .isNotNull();
    }

    @Test
    void poll_releasesExpiredLeaseAndRedeliversEvent() {
        UUID eventId = seed(EventStatus.PROCESSING, null, 1);
        claims.save(claimFor(eventId, now().minusSeconds(30), null));

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(eventId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getAttempts()).isEqualTo(2);
        assertThat(claims
                        .findByEventIdAndConsumerName(eventId, properties.getConsumerName())
                        .orElseThrow()
                        .getAttemptCount())
                .isEqualTo(2);
    }

    @Test
    void poll_reprocessesFailedEventWhoseRetryIsDue() {
        UUID eventId = seed(EventStatus.FAILED, now().minusSeconds(1), 0);

        worker.pollOnce();

        OutboxEvent refreshed = events.findById(eventId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.SUCCEEDED);
        assertThat(refreshed.getAttempts()).isEqualTo(1);
        assertThat(claims
                        .findByEventIdAndConsumerName(eventId, properties.getConsumerName())
                        .orElseThrow()
                        .getCompletedAt())
                .isNotNull();
    }

    @Test
    void poll_skipsEventWhoseRetryIsNotYetDue() {
        UUID eventId = seed(EventStatus.FAILED, now().plusSeconds(300), 0);

        worker.pollOnce();

        assertThat(events.findById(eventId).orElseThrow().getStatus())
                .isEqualTo(EventStatus.FAILED);
        assertThat(claims.findByEventIdAndConsumerName(eventId, properties.getConsumerName()))
                .isEmpty();
    }

    @Test
    void poll_skipsPendingEventWhoseAvailabilityIsInTheFuture() {
        UUID eventId = seed(EventStatus.PENDING, now().plusSeconds(300), 0);

        worker.pollOnce();

        assertThat(events.findById(eventId).orElseThrow().getStatus())
                .isEqualTo(EventStatus.PENDING);
        assertThat(claims.findByEventIdAndConsumerName(eventId, properties.getConsumerName()))
                .isEmpty();
    }

    @Test
    void replay_deadLetteredEventReturnedToPendingAndRedelivered() {
        UUID eventId = seed(EventStatus.DEAD_LETTERED, null, 4);
        OutboxEventClaim claim = claimFor(eventId, null, null);
        claim.setDeadLetterAt(now());
        claim.setLastError("permanent failure");
        claim.setAttemptCount(properties.getMaxAttempts());
        claims.save(claim);

        int replayed = worker.replayDeadLettered();
        assertThat(replayed).isEqualTo(1);

        OutboxEvent refreshed = events.findById(eventId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(EventStatus.PENDING);
        assertThat(refreshed.getAttempts()).isZero();
        assertThat(refreshed.getProcessedAt()).isNull();

        OutboxEventClaim claimRefreshed = claims
                .findByEventIdAndConsumerName(eventId, properties.getConsumerName())
                .orElseThrow();
        assertThat(claimRefreshed.getDeadLetterAt()).isNull();
        assertThat(claimRefreshed.getLastError()).isNull();
        assertThat(claimRefreshed.getAttemptCount()).isZero();

        worker.pollOnce();

        assertThat(events.findById(eventId).orElseThrow().getStatus())
                .isEqualTo(EventStatus.SUCCEEDED);
    }

    private LocalDateTime now() {
        return LocalDateTime.now();
    }

    private OutboxEventClaim claimFor(UUID eventId, LocalDateTime lease, LocalDateTime completed) {
        OutboxEventClaim claim = new OutboxEventClaim();
        claim.setEventId(eventId);
        claim.setConsumerName(properties.getConsumerName());
        claim.setWorkerId("test-worker");
        claim.setClaimedAt(now());
        claim.setLeaseExpiresAt(lease);
        claim.setAttemptCount(1);
        claim.setCompletedAt(completed);
        return claims.save(claim);
    }
}