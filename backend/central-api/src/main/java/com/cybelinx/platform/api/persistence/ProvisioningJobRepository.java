package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code provisioningJob} queries with distributed lease locking (TRD §15). */
public interface ProvisioningJobRepository extends JpaRepository<ProvisioningJob, UUID> {

    List<ProvisioningJob> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /**
     * Oldest pending job, locked with {@code SELECT ... FOR UPDATE} so a single
     * worker claims it: two concurrent calls cannot return the same row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProvisioningJob> findFirstByStateOrderByQueuedAtAsc(ProvisioningState state);

    /**
     * Pessimistically locks eligible pending or expired-lease in-progress jobs
     * for distributed worker execution with lease management (Phase 1B Milestone 1).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT j FROM ProvisioningJob j
        WHERE (j.state = com.cybelinx.platform.api.domain.ProvisioningState.PENDING AND (j.nextRetryAt IS NULL OR j.nextRetryAt <= :now))
           OR (j.state = com.cybelinx.platform.api.domain.ProvisioningState.IN_PROGRESS AND j.leaseExpiresAt IS NOT NULL AND j.leaseExpiresAt < :now)
        ORDER BY j.queuedAt ASC
        """)
    List<ProvisioningJob> findEligibleForClaim(@Param("now") LocalDateTime now);
}
