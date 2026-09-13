package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.persistence.ProvisioningJobRepository;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
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
 * Default {@link ProvisioningEngine} — the Cap-11 execution delta over the
 * provisioning scaffold (TRD §14 workflow, §15 job model). Claims the oldest
 * pending job via the repository's pessimistic {@code SELECT ... FOR UPDATE},
 * advances its ordered steps one at a time recording per-step start/finish/
 * status/error, recomputes progress, and reaches {@code SUCCEEDED} only when
 * every step is finished. Idempotent (TRD §14.2): terminal jobs and already
 * {@code SUCCEEDED} steps are never re-executed.
 */
@Service
public class DefaultProvisioningEngine implements ProvisioningEngine {

    private static final Logger log = LoggerFactory.getLogger(DefaultProvisioningEngine.class);

    private final ProvisioningJobRepository jobs;
    private final Map<String, ProvisioningStepHandler> handlers;

    public DefaultProvisioningEngine(
            ProvisioningJobRepository jobs, List<ProvisioningStepHandler> stepHandlers) {
        this.jobs = jobs;
        this.handlers = stepHandlers.stream()
                .collect(Collectors.toMap(ProvisioningStepHandler::supportedStepName, Function.identity()));
    }

    @Override
    @Transactional
    public ProvisioningJob claimNextEligible() {
        return jobs.findFirstByStateOrderByQueuedAtAsc(ProvisioningState.PENDING)
                .map(candidate -> {
                    candidate.setState(ProvisioningState.IN_PROGRESS);
                    candidate.setStartedAt(LocalDateTime.now(ZoneOffset.UTC));
                    log.info("Provisioning job claimed tenant={} job={}",
                            candidate.getTenant().getId(), candidate.getId());
                    return candidate;
                })
                .orElse(null);
    }

    @Override
    @Transactional
    public ProvisioningJob advance(UUID jobId) {
        ProvisioningJob job = jobs.findById(jobId).orElse(null);
        if (job == null) {
            return null;
        }
        if (isTerminal(job) || job.getState() != ProvisioningState.IN_PROGRESS) {
            return job;
        }

        List<ProvisioningStep> ordered = job.getSteps();
        ProvisioningStep current = ordered.stream()
                .filter(step -> step.getStatus() == ProvisioningStepStatus.PENDING)
                .findFirst()
                .orElse(null);
        if (current == null) {
            job.setState(ProvisioningState.SUCCEEDED);
            job.setProgress(100);
            job.setFinishedAt(LocalDateTime.now(ZoneOffset.UTC));
            return job;
        }

        current.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        current.setStartedAt(LocalDateTime.now(ZoneOffset.UTC));

        ProvisioningStepHandler handler = handlers.get(current.getName());
        try {
            if (handler == null) {
                throw new IllegalArgumentException(
                        "no provisioning step handler registered for step '" + current.getName() + "'");
            }
            handler.execute(job, current);
            current.setStatus(ProvisioningStepStatus.SUCCEEDED);
            current.setFinishedAt(LocalDateTime.now(ZoneOffset.UTC));
        } catch (RuntimeException failure) {
            current.setStatus(ProvisioningStepStatus.FAILED);
            current.setErrorMessage(failure.getMessage());
            current.setFinishedAt(LocalDateTime.now(ZoneOffset.UTC));
            job.setState(ProvisioningState.FAILED);
            job.setErrorCode("PROVISIONING_STEP_FAILED");
            job.setErrorMessage(current.getName() + ": " + failure.getMessage());
            job.setFinishedAt(LocalDateTime.now(ZoneOffset.UTC));
            throw failure;
        }

        long done = ordered.stream()
                .filter(step -> step.getStatus() == ProvisioningStepStatus.SUCCEEDED)
                .count();
        job.setProgress((int) (done * 100 / (long) Math.max(1, ordered.size())));
        return job;
    }

    @Override
    public List<ProvisioningJob> findByTenantId(UUID tenantId) {
        return jobs.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Override
    public boolean isTerminal(ProvisioningJob job) {
        ProvisioningState state = job.getState();
        return state == ProvisioningState.SUCCEEDED
                || state == ProvisioningState.FAILED
                || state == ProvisioningState.CANCELLED
                || state == ProvisioningState.ROLLED_BACK;
    }
}