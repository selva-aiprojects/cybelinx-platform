package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import java.time.LocalDateTime;
import java.util.UUID;

/** HTTP-visible projection of a provisioning job (TRD §15 job model). */
public record ProvisioningJobPayload(
        UUID id,
        UUID tenantId,
        UUID tenantProductId,
        UUID tenantResourceId,
        String operation,
        String state,
        int progress,
        String errorCode,
        String errorMessage,
        LocalDateTime queuedAt,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        java.util.List<ProvisioningStepPayload> steps) {

    static ProvisioningJobPayload from(ProvisioningJob job) {
        return new ProvisioningJobPayload(
                job.getId(),
                job.getTenant() != null && job.getTenant().getId() != null ? job.getTenant().getId() : null,
                job.getTenantProduct() != null && job.getTenantProduct().getId() != null
                        ? job.getTenantProduct().getId()
                        : null,
                job.getTenantResource() != null && job.getTenantResource().getId() != null
                        ? job.getTenantResource().getId()
                        : null,
                job.getOperation() != null ? job.getOperation().name() : null,
                job.getState() != null ? job.getState().name() : null,
                job.getProgress(),
                job.getErrorCode(),
                job.getErrorMessage(),
                job.getQueuedAt(),
                job.getStartedAt(),
                job.getFinishedAt(),
                job.getSteps() == null
                        ? java.util.List.of()
                        : job.getSteps().stream().map(ProvisioningStepPayload::from).toList());
    }
}