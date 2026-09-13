package com.cybelinx.platform.worker.outbox;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repository over {@code platform_events} for claiming and replaying outbox rows. */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    /**
     * Due events for a consumer: {@code PENDING} with no future {@code available_at}, or
     * {@code FAILED} whose retry is due. Locked pessimistically so concurrent workers claim
     * disjoint rows (TRD §18); {@code available_at} is blank on first publish and only set
     * once the consumer schedules a retry.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT e FROM OutboxEvent e
        WHERE (e.status = com.cybelinx.platform.worker.outbox.EventStatus.PENDING
               AND (e.availableAt IS NULL OR e.availableAt <= :now))
           OR (e.status = com.cybelinx.platform.worker.outbox.EventStatus.FAILED
               AND e.availableAt IS NOT NULL AND e.availableAt <= :now)
        ORDER BY e.createdAt ASC
        """)
    List<OutboxEvent> findDueEvents(@Param("now") LocalDateTime now, Pageable pageable);

    Optional<OutboxEvent> findByCorrelationId(String correlationId);
}