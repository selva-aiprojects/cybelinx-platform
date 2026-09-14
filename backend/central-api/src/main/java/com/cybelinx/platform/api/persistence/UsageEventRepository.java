package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.UsageEvent;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repository for {@code usage_events} — metering ingest + query. */
public interface UsageEventRepository
        extends JpaRepository<UsageEvent, UUID>, JpaSpecificationExecutor<UsageEvent> {

    Optional<UsageEvent> findByDedupeKey(String dedupeKey);

    @Query("SELECT COALESCE(SUM(u.quantity), 0) FROM UsageEvent u WHERE u.tenant.id = :tenantId AND u.eventType = :eventType AND u.occurredAt >= :since")
    BigDecimal sumQuantityByTenantAndEventTypeSince(
            @Param("tenantId") UUID tenantId,
            @Param("eventType") String eventType,
            @Param("since") LocalDateTime since);
}
