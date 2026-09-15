package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Spring Data repository for {@code audit_events} — write and read paths. */
public interface AuditEventRepository
        extends JpaRepository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {

    java.util.List<AuditEvent> findByTenant_Id(UUID tenantId);
}