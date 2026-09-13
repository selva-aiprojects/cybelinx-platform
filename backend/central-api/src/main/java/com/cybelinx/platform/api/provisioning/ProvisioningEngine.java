package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import java.util.List;
import java.util.UUID;

/**
 * Capability 11 — Provisioning Engine (TRD §14 / §15).
 *
 * <p>Drives {@code provisioning_jobs} through ordered {@code provisioning_steps}
 * (TRD §15 step record: start time, completion time, status, attempt count, error
 * code, error message, correlation id). Execution is idempotent per TRD §14.2 —
 * calling {@link #advance(UUID)} repeatedly never re-runs a {@code SUCCEEDED}
 * step and never creates duplicate jobs/schemas/resources.
 *
 * <p>Claim semantics: {@link #claimNextEligible()} picks the oldest {@code PENDING}
 * job behind a pessimistic {@code FOR UPDATE} so concurrent workers claim disjoint
 * jobs (TRD §15 job record / lease column). No product business data is written by
 * the engine — steps only touch platform metadata (registry, catalog, audit, event
 * rows), matching the metadata-only control plane.
 */
public interface ProvisioningEngine {

    /**
     * Claim the oldest eligible provisioning job for this worker instance.
     * Eligible = {@code PENDING} (or {@code FAILED} whose retry is due).
     * Returns {@code null} when there is nothing to claim.
     */
    ProvisioningJob claimNextEligible();

    /**
     * Advance an already-claimed job: run the next {@code PENDING} step in
     * sequence order, record its outcome, update job progress, and flip the job
     * to {@code SUCCEEDED} when every step is finished. Idempotent.
     *
     * @return the job with its latest state
     */
    ProvisioningJob advance(UUID jobId);

    /** List a tenant's provisioning jobs newest-first (TRD §15). */
    List<ProvisioningJob> findByTenantId(UUID tenantId);

    /** True if the job reached a terminal state (SUCCEEDED/FAILED/CANCELLED). */
    boolean isTerminal(ProvisioningJob job);
}
