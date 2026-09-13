package com.cybelinx.platform.worker.outbox;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repository over {@code event_processing} — per-consumer claim/idempotency state. */
public interface OutboxEventClaimRepository extends JpaRepository<OutboxEventClaim, UUID> {

    Optional<OutboxEventClaim> findByEventIdAndConsumerName(UUID eventId, String consumerName);

    /**
     * Claims whose lease lapsed before a finish was recorded — a crash mid-flight. The poller
     * releases the owning event back to {@code PENDING} so it is redelivered (at-least-once).
     */
    @Query("""
        SELECT c FROM OutboxEventClaim c
        WHERE c.completedAt IS NULL
          AND c.deadLetterAt IS NULL
          AND c.leaseExpiresAt IS NOT NULL
          AND c.leaseExpiresAt < :now
        """)
    List<OutboxEventClaim> findExpiredLeases(@Param("now") LocalDateTime now);
}