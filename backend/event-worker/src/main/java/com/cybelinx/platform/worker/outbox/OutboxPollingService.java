package com.cybelinx.platform.worker.outbox;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core outbox consumption loop (TRD §18): claim → process → complete, with retry/backoff and a
 * dead-letter terminal state.
 *
 * <p>Each poll cycle, inside one transaction for the whole batch:
 * <ol>
 *   <li>leases whose {@code lease_expires_at} lapsed are released back to {@code PENDING};</li>
 *   <li>due {@code PENDING} and retry-due {@code FAILED} rows are claimed with a pessimistic
 *       write lock and run to {@code SUCCEEDED};</li>
 *   <li>a failed processor either schedules {@code FAILED} with exponential backoff or, once
 *       {@code maxAttempts} is exhausted, moves the row to {@code DEAD_LETTERED}.</li>
 * </ol>
 *
 * <p>Delivery is at-least-once: idempotency on ({@code event_id}, {@code consumer_name}) is the
 * single writer's guarantee (central-api writes once; the consumer upserts its claim row), and
 * any crash mid-flight is re-claimed by the lease release above.
 */
@Service
public class OutboxPollingService {

    private static final Logger LOG = LoggerFactory.getLogger(OutboxPollingService.class);

    private static final long MAX_BACKOFF_SECONDS = 300L;

    private static final long BACKOFF_BASE_SECONDS = 5L;

    private final OutboxEventRepository eventRepository;

    private final OutboxEventClaimRepository claimRepository;

    private final WorkerProperties properties;

    private final List<EventProcessor> processors;

    private final String workerId;

    public OutboxPollingService(
            OutboxEventRepository eventRepository,
            OutboxEventClaimRepository claimRepository,
            WorkerProperties properties,
            List<EventProcessor> processors) {
        this.eventRepository = eventRepository;
        this.claimRepository = claimRepository;
        this.properties = properties;
        this.processors = processors;
        this.workerId = properties.getConsumerName() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Transactional
    public void pollOnce() {
        LocalDateTime now = LocalDateTime.now();
        releaseExpiredLeases(now);

        List<OutboxEvent> due =
                eventRepository.findDueEvents(now, PageRequest.of(0, properties.getBatchSize()));
        for (OutboxEvent event : due) {
            process(event, now);
        }
    }

    private void releaseExpiredLeases(LocalDateTime now) {
        for (OutboxEventClaim claim : claimRepository.findExpiredLeases(now)) {
            eventRepository
                    .findById(claim.getEventId())
                    .ifPresent(event -> {
                        if (event.getStatus() == EventStatus.PROCESSING) {
                            LOG.warn(
                                    "Releasing expired lease on event {} from worker {} "
                                            + "(lease expired {})",
                                    event.getId(),
                                    claim.getWorkerId(),
                                    claim.getLeaseExpiresAt());
                            event.setStatus(EventStatus.PENDING);
                            event.setAvailableAt(now);
                            eventRepository.save(event);
                        }
                    });
            claim.setLeaseExpiresAt(null);
            claimRepository.save(claim);
        }
    }

    private void process(OutboxEvent event, LocalDateTime now) {
        Optional<OutboxEventClaim> existing =
                claimRepository.findByEventIdAndConsumerName(event.getId(), properties.getConsumerName());
        if (existing.isPresent() && existing.get().getCompletedAt() != null) {
            return;
        }
        if (existing.isPresent() && existing.get().getDeadLetterAt() != null) {
            return;
        }

        EventProcessor processor = selectProcessor(event);
        if (processor == null) {
            LOG.warn(
                    "No processor subscribes to event type {} (consumer {}); leaving event {} pending",
                    event.getEventType(),
                    properties.getConsumerName(),
                    event.getId());
            return;
        }

        int attempt = event.getAttempts() + 1;
        event.setAttempts(attempt);
        event.setStatus(EventStatus.PROCESSING);
        event.setAvailableAt(null);

        OutboxEventClaim claim = existing.orElseGet(OutboxEventClaim::new);
        claim.setEventId(event.getId());
        claim.setConsumerName(properties.getConsumerName());
        claim.setWorkerId(workerId);
        claim.setClaimedAt(now);
        claim.setLeaseExpiresAt(now.plusSeconds(properties.getLeaseSeconds()));
        claim.setAttemptCount(attempt);

        eventRepository.save(event);
        try {
            processor.process(event);
            event.setStatus(EventStatus.SUCCEEDED);
            event.setProcessedAt(now);
            claim.setLastError(null);
            claim.setErrorStack(null);
            claim.setLeaseExpiresAt(null);
            claim.setCompletedAt(now);
            LOG.info(
                    "Event {} (type {}) processed by consumer {} on attempt {}",
                    event.getId(),
                    event.getEventType(),
                    properties.getConsumerName(),
                    attempt);
        } catch (RuntimeException ex) {
            claim.setLastError(ex.getMessage());
            claim.setErrorStack(stackTrace(ex));
            if (attempt >= properties.getMaxAttempts()) {
                event.setStatus(EventStatus.DEAD_LETTERED);
                claim.setDeadLetterAt(now);
                claim.setLeaseExpiresAt(null);
                LOG.error(
                        "Event {} (type {}) dead-lettered after {} attempts: {}",
                        event.getId(),
                        event.getEventType(),
                        attempt,
                        ex.getMessage(),
                        ex);
            } else {
                LocalDateTime nextAttempt = now.plusSeconds(backoffSeconds(attempt));
                event.setStatus(EventStatus.FAILED);
                event.setAvailableAt(nextAttempt);
                LOG.warn(
                        "Event {} (type {}) failed on attempt {}; retrying at {}: {}",
                        event.getId(),
                        event.getEventType(),
                        attempt,
                        nextAttempt,
                        ex.getMessage());
            }
        }
        eventRepository.save(event);
        claimRepository.save(claim);
    }

    private EventProcessor selectProcessor(OutboxEvent event) {
        for (EventProcessor candidate : processors) {
            if (properties.getConsumerName().equals(candidate.consumerName())
                    && candidate.supports(event.getEventType())) {
                return candidate;
            }
        }
        return null;
    }

    private static long backoffSeconds(int attempt) {
        return Math.min(
                MAX_BACKOFF_SECONDS, BACKOFF_BASE_SECONDS * (long) Math.pow(2, attempt - 1));
    }

    private static String stackTrace(Throwable throwable) {
        String trace = java.util.Arrays.stream(throwable.getStackTrace())
                .map(StackTraceElement::toString)
                .reduce(throwable.toString(), (a, b) -> a + System.lineSeparator() + b);
        return trace.length() > 4000 ? trace.substring(0, 4000) : trace;
    }
}