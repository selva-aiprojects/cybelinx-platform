package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Entitlement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code entitlement} Prisma queries. */
public interface EntitlementRepository extends JpaRepository<Entitlement, UUID> {

    Optional<Entitlement> findByPlanIdAndKey(UUID planId, String key);

    Optional<Entitlement> findByIdAndPlanId(UUID id, UUID planId);

    List<Entitlement> findByPlanIdOrderByCreatedAtAsc(UUID planId);
}