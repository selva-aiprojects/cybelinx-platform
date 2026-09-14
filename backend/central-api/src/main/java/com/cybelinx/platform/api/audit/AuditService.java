package com.cybelinx.platform.api.audit;

import com.cybelinx.platform.api.audit.AuditViews.AuditEventView;
import com.cybelinx.platform.api.audit.AuditViews.AuditListResponse;
import com.cybelinx.platform.api.audit.AuditViews.Meta;
import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only query service for the platform audit log (Capability 21). */
@Service
public class AuditService {

    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    public AuditService(AuditEventRepository auditEvents, AuthorizationService authorization) {
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public AuditListResponse listAuditEvents(
            AuthPrincipal principal,
            String entityType,
            String entityId,
            String tenantId,
            int page,
            int limit,
            String sort) {

        assertPlatformPermission(principal.user().id(), AuditConstants.PERMISSION_AUDIT_READ);

        Specification<AuditEvent> spec = buildSpec(entityType, entityId, tenantId);
        Sort ordering = parseSort(sort);
        Page<AuditEvent> resultPage =
                auditEvents.findAll(spec, PageRequest.of(page - 1, limit, ordering));

        List<AuditEventView> views = resultPage.getContent().stream().map(this::toView).toList();
        Meta meta = new Meta(page, limit, resultPage.getTotalElements(), resultPage.getTotalPages());
        return new AuditListResponse(views, meta);
    }

    @Transactional(readOnly = true)
    public AuditEventView getAuditEvent(AuthPrincipal principal, UUID auditId) {
        assertPlatformPermission(principal.user().id(), AuditConstants.PERMISSION_AUDIT_READ);
        AuditEvent event = auditEvents.findById(auditId)
                .orElseThrow(() -> new ApiError(ErrorCode.TENANT_NOT_FOUND,
                        "Audit event not found: " + auditId, Map.of("auditId", auditId.toString())));
        return toView(event);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(AuthorizationService.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission, Map.of("permission", permission));
        }
    }

    private Specification<AuditEvent> buildSpec(String entityType, String entityId, String tenantId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null && !entityId.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("entityId"), UUID.fromString(entityId)));
                } catch (IllegalArgumentException ignored) {
                    predicates.add(cb.disjunction());
                }
            }
            if (tenantId != null && !tenantId.isBlank()) {
                try {
                    UUID tid = UUID.fromString(tenantId);
                    predicates.add(cb.equal(root.join("tenant").get("id"), tid));
                } catch (IllegalArgumentException ignored) {
                    predicates.add(cb.disjunction());
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank() || sort.equals("-occurredAt")) {
            return Sort.by(Sort.Direction.DESC, "occurredAt");
        }
        if (sort.equals("occurredAt")) return Sort.by(Sort.Direction.ASC, "occurredAt");
        return Sort.by(Sort.Direction.DESC, "occurredAt");
    }

    private AuditEventView toView(AuditEvent e) {
        return new AuditEventView(
                e.getId() != null ? e.getId().toString() : null,
                e.getTenant() != null ? e.getTenant().getId().toString() : null,
                e.getUser() != null ? e.getUser().getId().toString() : null,
                e.getProduct() != null ? e.getProduct().getId().toString() : null,
                e.getActorType(),
                e.getAction(),
                e.getEntityType(),
                e.getEntityId() != null ? e.getEntityId().toString() : null,
                e.getMetadata(),
                e.getIpAddress(),
                e.getRequestId(),
                e.getOccurredAt() != null ? IsoTime.format(e.getOccurredAt()) : null);
    }
}
