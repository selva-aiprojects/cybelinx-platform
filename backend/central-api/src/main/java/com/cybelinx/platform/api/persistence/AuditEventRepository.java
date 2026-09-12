package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code auditEvent} Prisma queries. */
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
}