package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.domain.EventStatus;
import com.cybelinx.platform.api.persistence.entity.PlatformEvent;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data repository for platform event outbox. */
public interface PlatformEventRepository extends JpaRepository<PlatformEvent, UUID> {

    @Query("""
        SELECT e FROM PlatformEvent e
        WHERE e.status = :status AND (e.availableAt IS NULL OR e.availableAt <= :now)
        ORDER BY e.createdAt ASC
        """)
    List<PlatformEvent> findEligibleEvents(@Param("status") EventStatus status, @Param("now") LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT e FROM PlatformEvent e
        WHERE e.status = :status AND (e.availableAt IS NULL OR e.availableAt <= :now)
        ORDER BY e.createdAt ASC
        """)
    List<PlatformEvent> findEligibleEventsWithLock(@Param("status") EventStatus status, @Param("now") LocalDateTime now);

    List<PlatformEvent> findByTenantId(UUID tenantId);
}
