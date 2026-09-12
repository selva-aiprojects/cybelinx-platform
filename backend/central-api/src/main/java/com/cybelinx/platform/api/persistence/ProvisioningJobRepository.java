package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code provisioningJob} Prisma queries. */
public interface ProvisioningJobRepository extends JpaRepository<ProvisioningJob, UUID> {

    List<ProvisioningJob> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}