package com.cybelinx.platform.api.events;

import com.cybelinx.platform.api.audit.AuditConstants;
import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.persistence.PlatformEventRepository;
import com.cybelinx.platform.api.persistence.entity.PlatformEvent;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only platform event outbox viewer for the admin portal (Capability 26). */
@RestController
@RequestMapping("/events")
public class PlatformEventController {

    private final PlatformEventRepository platformEvents;
    private final AuthorizationService authorization;

    public PlatformEventController(
            PlatformEventRepository platformEvents, AuthorizationService authorization) {
        this.platformEvents = platformEvents;
        this.authorization = authorization;
    }

    public record EventView(
            String eventId,
            String eventType,
            String schemaVersion,
            String tenantId,
            String productId,
            String entityType,
            String entityId,
            String status,
            String source,
            String occurredAt,
            String createdAt) {}

    public record EventListResponse(List<EventView> data, Meta meta) {}

    public record Meta(int page, int limit, long total, long totalPages) {}

    @GetMapping
    @RequirePermissions(AuditConstants.PERMISSION_AUDIT_READ)
    public EventListResponse listEvents(
            @CurrentPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String eventType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {

        assertPlatformPermission(principal.user().id(), AuditConstants.PERMISSION_AUDIT_READ);

        int safePage = Math.max(1, page);
        int safeLimit = Math.min(200, Math.max(1, limit));

        Page<PlatformEvent> resultPage;
        boolean hasTenant = tenantId != null && !tenantId.isBlank();
        boolean hasEntityType = entityType != null && !entityType.isBlank();
        boolean hasEventType = eventType != null && !eventType.isBlank();

        if (hasTenant || hasEntityType || hasEventType) {
            UUID tid = null;
            if (hasTenant) {
                try {
                    tid = UUID.fromString(tenantId);
                } catch (IllegalArgumentException e) {
                    return new EventListResponse(List.of(), new Meta(safePage, safeLimit, 0, 0));
                }
            }
            UUID filterTenant = tid;
            String filterEntityType = hasEntityType ? entityType.trim() : null;
            String filterEventType = hasEventType ? eventType.trim() : null;
            resultPage = platformEvents.findAll(
                    (root, query, cb) -> {
                        var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                        if (filterTenant != null) {
                            predicates.add(cb.equal(root.join("tenant").get("id"), filterTenant));
                        }
                        if (filterEntityType != null) {
                            predicates.add(cb.equal(cb.lower(root.get("entityType")), filterEntityType.toLowerCase()));
                        }
                        if (filterEventType != null) {
                            predicates.add(cb.equal(cb.lower(root.get("eventType")), filterEventType.toLowerCase()));
                        }
                        return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
                    },
                    PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        } else {
            resultPage = platformEvents.findAll(
                    PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        }

        List<EventView> views = resultPage.getContent().stream().map(this::toView).toList();
        return new EventListResponse(views,
                new Meta(safePage, safeLimit, resultPage.getTotalElements(), resultPage.getTotalPages()));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(AuthorizationService.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission, Map.of("permission", permission));
        }
    }

    private EventView toView(PlatformEvent e) {
        return new EventView(
                e.getId() != null ? e.getId().toString() : null,
                e.getEventType(),
                e.getSchemaVersion(),
                e.getTenant() != null ? e.getTenant().getId().toString() : null,
                e.getProduct() != null ? e.getProduct().getId().toString() : null,
                e.getEntityType(),
                e.getEntityId() != null ? e.getEntityId().toString() : null,
                e.getStatus() != null ? e.getStatus().name() : null,
                e.getSource(),
                e.getOccurredAt() != null ? IsoTime.format(e.getOccurredAt()) : null,
                e.getCreatedAt() != null ? IsoTime.format(e.getCreatedAt()) : null);
    }
}
