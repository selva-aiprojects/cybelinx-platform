package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.persistence.ProvisioningJobRepository;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default {@link ProvisioningEngine} — execution engine with lease locking and retry (Phase 1B Milestone 1).
 * Claims pending or expired-lease jobs using pessimistic locking, advances ordered steps with individual
 * status/error tracking, recomputes progress, and implements exponential backoff retry.
 */
@Service
public class DefaultProvisioningEngine implements ProvisioningEngine {

    private static final Logger log = LoggerFactory.getLogger(DefaultProvisioningEngine.class);

    private final ProvisioningJobRepository jobs;
    private final OutboxPublisher outbox;
    private final Map<String, ProvisioningStepHandler> handlers;
    private final String defaultWorkerId = "worker-" + UUID.randomUUID().toString().substring(0, 8);

    public DefaultProvisioningEngine(
            ProvisioningJobRepository jobs, List<ProvisioningStepHandler> stepHandlers, OutboxPublisher outbox) {
        this.jobs = jobs;
        this.outbox = outbox;
        this.handlers = stepHandlers.stream()
                .collect(Collectors.toMap(
                        ProvisioningStepHandler::supportedStepName,
                        Function.identity(),
                        (existing, replacing) -> replacing));
    }

    @Override
    @Transactional
    public ProvisioningJob claimNextEligible() {
        return claimNextEligible(defaultWorkerId, 300);
    }

    @Transactional
    public ProvisioningJob claimNextEligible(String workerId, int leaseSeconds) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<ProvisioningJob> candidates = jobs.findEligibleForClaim(now);
        if (candidates.isEmpty()) {
            return jobs.findFirstByStateOrderByQueuedAtAsc(ProvisioningState.PENDING)
                    .map(candidate -> {
                        candidate.setState(ProvisioningState.IN_PROGRESS);
                        candidate.setLeaseOwner(workerId);
                        candidate.setLeaseExpiresAt(now.plusSeconds(leaseSeconds));
                        if (candidate.getStartedAt() == null) {
                            candidate.setStartedAt(now);
                        }
                        log.info("Provisioning job claimed tenant={} job={} worker={}",
                                candidate.getTenant().getId(), candidate.getId(), workerId);
                        return candidate;
                    })
                    .orElse(null);
        }

        ProvisioningJob candidate = candidates.get(0);
        candidate.setState(ProvisioningState.IN_PROGRESS);
        candidate.setLeaseOwner(workerId);
        candidate.setLeaseExpiresAt(now.plusSeconds(leaseSeconds));
        if (candidate.getStartedAt() == null) {
            candidate.setStartedAt(now);
        }
        log.info("Provisioning job claimed tenant={} job={} worker={}",
                candidate.getTenant().getId(), candidate.getId(), workerId);
        return candidate;
    }

    @Override
    @Transactional
    public ProvisioningJob advance(UUID jobId) {
        ProvisioningJob job = jobs.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("provisioning job not found: " + jobId));

        if (isTerminal(job)) {
            return job;
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<ProvisioningStep> ordered = job.getSteps();
        ProvisioningStep current = ordered.stream()
                .filter(step -> step.getStatus() == ProvisioningStepStatus.PENDING)
                .findFirst()
                .orElse(null);

        if (current == null) {
            job.setState(ProvisioningState.SUCCEEDED);
            job.setProgress(100);
            job.setFinishedAt(now);
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            emitProvisioned(job);
            return job;
        }

        current.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        current.setStartedAt(now);

        ProvisioningStepHandler handler = handlers.get(current.getName());
        try {
            if (handler == null) {
                throw new IllegalArgumentException(
                        "no provisioning step handler registered for step '"
                                + current.getName() + "'");
            }
            handler.execute(job, current);
            current.setStatus(ProvisioningStepStatus.SUCCEEDED);
            current.setFinishedAt(now);
        } catch (RuntimeException failure) {
            current.setStatus(ProvisioningStepStatus.FAILED);
            current.setErrorMessage(failure.getMessage());
            current.setFinishedAt(now);

            int nextAttempt = job.getAttemptCount() + 1;
            job.setAttemptCount(nextAttempt);

            if (handler == null || nextAttempt >= job.getMaxAttempts()) {
                job.setState(ProvisioningState.FAILED);
                job.setErrorCode("PROVISIONING_STEP_FAILED");
                job.setErrorMessage(current.getName() + ": " + failure.getMessage());
                job.setFinishedAt(now);
                job.setLeaseOwner(null);
                job.setLeaseExpiresAt(null);
                emitFailed(job, current.getName(), failure.getMessage());
            } else {
                long backoffSeconds = (long) Math.pow(2, nextAttempt) * 2;
                job.setNextRetryAt(now.plusSeconds(backoffSeconds));
                job.setState(ProvisioningState.PENDING);
                job.setLeaseOwner(null);
                job.setLeaseExpiresAt(null);
                job.setErrorCode("PROVISIONING_STEP_RETRYABLE");
                job.setErrorMessage(current.getName() + " failed (attempt " + nextAttempt + "/" + job.getMaxAttempts() + "): " + failure.getMessage());
                log.warn("Provisioning step {} failed for job {}, scheduled retry in {}s", current.getName(), job.getId(), backoffSeconds);
            }
            return job;
        }

        long succeeded = ordered.stream()
                .filter(step -> step.getStatus() == ProvisioningStepStatus.SUCCEEDED)
                .count();
        job.setProgress((int) Math.round(((double) succeeded / ordered.size()) * 100));

        if (succeeded == ordered.size()) {
            job.setState(ProvisioningState.SUCCEEDED);
            job.setFinishedAt(now);
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            emitProvisioned(job);
        }

        return job;
    }

    @Override
    public List<ProvisioningJob> findByTenantId(UUID tenantId) {
        return jobs.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Override
    public boolean isTerminal(ProvisioningJob job) {
        if (job == null) {
            return false;
        }
        ProvisioningState state = job.getState();
        return state == ProvisioningState.SUCCEEDED
                || state == ProvisioningState.FAILED
                || state == ProvisioningState.CANCELLED
                || state == ProvisioningState.ROLLED_BACK;
    }

    private void emitProvisioned(ProvisioningJob job) {
        Product product = productOf(job);
        outbox.publishProvisioningEvent(
                OutboxPublisher.TENANT_PROVISIONED,
                job.getTenant(),
                product,
                job.getTenantResource() != null ? job.getTenantResource().getId() : null,
                Map.of(
                        "jobId", job.getId().toString(),
                        "operation", job.getOperation().name(),
                        "state", job.getState().name()));
    }

    private void emitFailed(ProvisioningJob job, String stepName, String message) {
        Product product = productOf(job);
        outbox.publishProvisioningEvent(
                OutboxPublisher.RESOURCE_FAILED,
                job.getTenant(),
                product,
                job.getTenantResource() != null ? job.getTenantResource().getId() : null,
                Map.of(
                        "jobId", job.getId().toString(),
                        "step", stepName,
                        "error", message));
    }

    private Product productOf(ProvisioningJob job) {
        if (job.getTenantProduct() != null && job.getTenantProduct().getProduct() != null) {
            return job.getTenantProduct().getProduct();
        }
        if (job.getTenantResource() != null && job.getTenantResource().getProduct() != null) {
            return job.getTenantResource().getProduct();
        }
        return null;
    }
}
