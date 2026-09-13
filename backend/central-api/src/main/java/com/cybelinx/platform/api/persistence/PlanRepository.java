package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.persistence.entity.Plan;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code plan} Prisma queries. */
public interface PlanRepository extends JpaRepository<Plan, UUID> {

    Optional<Plan> findByProductIdAndPlanCode(UUID productId, String planCode);

    Optional<Plan> findByIdAndProductId(UUID id, UUID productId);

    List<Plan> findByProductIdOrderByCreatedAtAsc(UUID productId);

    List<Plan> findByProductIdAndStatusOrderByCreatedAtAsc(UUID productId, PlanStatus status);

    Optional<Plan> findFirstByProductIdAndStatusOrderByCreatedAtAsc(UUID productId, PlanStatus status);
}