package com.cybelinx.platform.api.audit;

import com.cybelinx.platform.api.audit.AuditViews.AuditEventView;
import com.cybelinx.platform.api.audit.AuditViews.AuditListResponse;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Platform audit log REST surface — {@code GET /audit} and {@code GET /audit/{id}}. */
@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @RequirePermissions(AuditConstants.PERMISSION_AUDIT_READ)
    public AuditListResponse listAuditEvents(
            @CurrentPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String tenantId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = AuditConstants.DEFAULT_SORT) String sort) {
        int safePage = Math.max(1, page);
        int safeLimit = Math.min(200, Math.max(1, limit));
        return auditService.listAuditEvents(
                principal, entityType, entityId, tenantId, safePage, safeLimit, sort);
    }

    @GetMapping("/{auditId}")
    @RequirePermissions(AuditConstants.PERMISSION_AUDIT_READ)
    public AuditEventView getAuditEvent(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID auditId) {
        return auditService.getAuditEvent(principal, auditId);
    }
}
