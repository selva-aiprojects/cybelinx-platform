package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

/** Spring Data port of the {@code provisioningJob} Prisma queries (TRD §15). */
public interface ProvisioningJobRepository extends JpaRepository<ProvisioningJob, UUID> {

    List<ProvisioningJob> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /**
     * Oldest pending job, locked with {@code SELECT ... FOR UPDATE} so a single
     * worker claims it: two concurrent calls cannot return the same row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProvisioningJob> findFirstByStateOrderByQueuedAtAsc(ProvisioningState state);
}