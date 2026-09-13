package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;

/**
 * Per-step provisioning handler (TRD §14.1 Provisioning Workflow).
 *
 * <p>Each implementation knows how to execute exactly one named provisioning
 * step (e.g. {@code CREATE_SCHEMA}, {@code APPLY_MIGRATIONS},
 * {@code CREATE_PRODUCT_CONFIG}, {@code VALIDATE}, {@code PUBLISH_EVENT}). The
 * engine advances steps in {@link ProvisioningStep#getSequence()} order and
 * invokes the handler that matches {@link ProvisioningStep#getName()}.
 *
 * <p>Handlers run inside the same JTA/Spring transaction as the claiming engine
 * so a failed step rolls back atomically with the job-row advance — no orphaned
 * half-provisioned state (TRD §14.1 workflow, idempotency §14.2). A handler that
 * cannot proceed must fail fast by throwing a runtime exception with a stable
 * error code/message so the engine can record it on the step and job.
 */
public interface ProvisioningStepHandler {

    /** Stable, exact step name this handler is registered for (e.g. {@code APPLY_MIGRATIONS}). */
    String supportedStepName();

    /**
     * Execute this step for the given job.
     *
     * @throws IllegalArgumentException  malformed step input from the job row
     * @throws IllegalStateException    domain/state precondition not satisfied
     * @throws RuntimeException         any operational provisioning failure
     */
    void execute(ProvisioningJob job, ProvisioningStep step);
}
