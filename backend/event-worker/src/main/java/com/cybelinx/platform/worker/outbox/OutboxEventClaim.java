package com.cybelinx.platform.worker.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read model of {@code event_processing} — per-consumer claim/lease, idempotency and
 * dead-letter bookkeeping (V1 + V4 columns). {@code event_id} held as a plain UUID.
 */
@Entity
@Table(
        name = "event_processing",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"event_id", "consumer_name"},
                name = "event_processing_event_consumer_unique"))
public class OutboxEventClaim extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "event_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID eventId;

    @Column(name = "consumer_name", nullable = false, length = 128)
    private String consumerName = "default";

    @Column(name = "worker_id", nullable = false, length = 64)
    private String workerId;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @Column(name = "lease_expires_at")
    private LocalDateTime leaseExpiresAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "error_stack")
    private String errorStack;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "dead_letter_at")
    private LocalDateTime deadLetterAt;

    public UUID getId() {
        return id;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public String getConsumerName() {
        return consumerName;
    }

    public void setConsumerName(String consumerName) {
        this.consumerName = consumerName;
    }

    public String getWorkerId() {
        return workerId;
    }

    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }

    public LocalDateTime getLeaseExpiresAt() {
        return leaseExpiresAt;
    }

    public void setLeaseExpiresAt(LocalDateTime leaseExpiresAt) {
        this.leaseExpiresAt = leaseExpiresAt;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public String getErrorStack() {
        return errorStack;
    }

    public void setErrorStack(String errorStack) {
        this.errorStack = errorStack;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getDeadLetterAt() {
        return deadLetterAt;
    }

    public void setDeadLetterAt(LocalDateTime deadLetterAt) {
        this.deadLetterAt = deadLetterAt;
    }
}