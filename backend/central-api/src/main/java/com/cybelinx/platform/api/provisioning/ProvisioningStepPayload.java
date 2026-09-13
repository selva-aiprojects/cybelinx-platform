package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import java.time.LocalDateTime;
import java.util.UUID;

/** HTTP-visible projection of a single provisioning step (TRD §15 step record). */
public record ProvisioningStepPayload(
        UUID id,
        int sequence,
        String name,
        String status,
        String errorMessage,
        LocalDateTime startedAt,
        LocalDateTime finishedAt) {

    static ProvisioningStepPayload from(ProvisioningStep step) {
        return new ProvisioningStepPayload(
                step.getId(),
                step.getSequence(),
                step.getName(),
                step.getStatus() != null ? step.getStatus().name() : null,
                step.getErrorMessage(),
                step.getStartedAt(),
                step.getFinishedAt());
    }
}