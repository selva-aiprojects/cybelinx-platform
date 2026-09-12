package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Spring Data port of the {@code tenant} Prisma queries. */
public interface TenantRepository extends JpaRepository<Tenant, UUID>, JpaSpecificationExecutor<Tenant> {

    Optional<Tenant> findByTenantCode(String tenantCode);
}