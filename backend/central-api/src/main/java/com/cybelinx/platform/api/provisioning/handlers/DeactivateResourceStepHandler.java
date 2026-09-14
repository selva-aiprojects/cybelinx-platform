package com.cybelinx.platform.api.provisioning.handlers;

import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.provisioning.ProvisioningStepHandler;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Concrete provisioning handler for {@code DEACTIVATE_RESOURCE} step (TRD §14/§15).
 * Transitions the tenant resource to SUSPENDED/DELEGATED status during deprovisioning.
 */
@Component
public class DeactivateResourceStepHandler implements ProvisioningStepHandler {

    private static final Logger log = LoggerFactory.getLogger(DeactivateResourceStepHandler.class);

    @Override
    public String supportedStepName() {
        return "DEACTIVATE_RESOURCE";
    }

    @Override
    public void execute(ProvisioningJob job, ProvisioningStep step) {
        if (job.getTenantResource() != null) {
            job.getTenantResource().setStatus(TenantResourceStatus.SUSPENDED);
            job.getTenantResource().setProvisioningState(ProvisioningState.SUCCEEDED);
            log.info("Deactivated tenant_resource={}", job.getTenantResource().getId());

            step.setOutput(Map.of(
                    "resourceDeactivated", true,
                    "resourceId", job.getTenantResource().getId().toString(),
                    "status", "SUSPENDED",
                    "deactivatedAt", LocalDateTime.now(ZoneOffset.UTC).toString()
            ));
        } else {
            step.setOutput(Map.of(
                    "resourceDeactivated", false,
                    "reason", "no tenant_resource bound to job"
            ));
        }
    }
}
