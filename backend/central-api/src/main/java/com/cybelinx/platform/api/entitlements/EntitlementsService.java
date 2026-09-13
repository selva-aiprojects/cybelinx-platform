package com.cybelinx.platform.api.entitlements;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.EntitlementStatus;
import com.cybelinx.platform.api.entitlements.EntitlementViews.EntitlementActionResponse;
import com.cybelinx.platform.api.entitlements.EntitlementViews.EntitlementListResponse;
import com.cybelinx.platform.api.entitlements.EntitlementViews.EntitlementView;
import com.cybelinx.platform.api.entitlements.dto.CreateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementStatusRequest;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.EntitlementRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Entitlement;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Entitlement catalog — feature grants / limits defined by a plan (metadata only). */
@Service
public class EntitlementsService {

    private final EntitlementRepository entitlements;
    private final PlanRepository plans;
    private final ProductRepository products;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public EntitlementsService(
            EntitlementRepository entitlements,
            PlanRepository plans,
            ProductRepository products,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.entitlements = entitlements;
        this.plans = plans;
        this.products = products;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional
    public EntitlementView createEntitlement(
            AuthPrincipal principal, UUID productId, UUID planId, CreateEntitlementRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);
        Plan plan = requirePlan(productId, planId);

        if (entitlements.findByPlanIdAndKey(planId, request.getKey()).isPresent()) {
            throw new ApiError(
                    ErrorCode.ENTITLEMENT_KEY_TAKEN,
                    "Entitlement key \"" + request.getKey() + "\" already exists on this plan",
                    Map.of("planId", planId.toString(), "key", request.getKey()));
        }

        Entitlement entitlement = new Entitlement();
        entitlement.setPlan(plan);
        entitlement.setKey(request.getKey());
        entitlement.setName(request.getName());
        entitlement.setValue(request.getValue());
        entitlement.setStatus(EntitlementStatus.ACTIVE);
        entitlement = entitlements.save(entitlement);

        writeAudit(
                principal,
                productId,
                entitlement.getId(),
                "entitlement.created",
                Map.of("planId", planId.toString(), "key", entitlement.getKey()));

        return toView(entitlement);
    }

    @Transactional(readOnly = true)
    public EntitlementListResponse listEntitlements(AuthPrincipal principal, UUID productId, UUID planId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        requirePlan(productId, planId);

        List<EntitlementView> data = entitlements.findByPlanIdOrderByCreatedAtAsc(planId).stream()
                .map(EntitlementsService::toView)
                .toList();
        return new EntitlementListResponse(data);
    }

    @Transactional(readOnly = true)
    public EntitlementView getEntitlement(
            AuthPrincipal principal, UUID productId, UUID planId, UUID entitlementId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        return toView(requireEntitlement(productId, planId, entitlementId));
    }

    @Transactional
    public EntitlementView updateEntitlement(
            AuthPrincipal principal,
            UUID productId,
            UUID planId,
            UUID entitlementId,
            UpdateEntitlementRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Entitlement entitlement = requireEntitlement(productId, planId, entitlementId);
        List<String> fields = new ArrayList<>();
        if (request.getName() != null) {
            entitlement.setName(request.getName());
            fields.add("name");
        }
        if (request.getValue() != null) {
            entitlement.setValue(request.getValue());
            fields.add("value");
        }
        entitlements.save(entitlement);

        writeAudit(
                principal,
                productId,
                entitlement.getId(),
                "entitlement.updated",
                Map.of("planId", planId.toString(), "fields", fields));

        return toView(entitlement);
    }

    @Transactional
    public EntitlementActionResponse updateEntitlementStatus(
            AuthPrincipal principal,
            UUID productId,
            UUID planId,
            UUID entitlementId,
            UpdateEntitlementStatusRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Entitlement entitlement = requireEntitlement(productId, planId, entitlementId);
        EntitlementStatus from = entitlement.getStatus();
        EntitlementStatus next = EntitlementTransitions.applyTransition(from, request.getStatus());
        entitlement.setStatus(next);
        entitlements.save(entitlement);

        writeAudit(
                principal,
                productId,
                entitlement.getId(),
                "entitlement.status_changed",
                Map.of("planId", planId.toString(), "from", from.name(), "to", next.name()));

        return new EntitlementActionResponse(entitlement.getId().toString(), next.name());
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private Plan requirePlan(UUID productId, UUID planId) {
        Plan plan = plans.findByIdAndProductId(planId, productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PLAN_NOT_FOUND,
                        "Plan \"" + planId + "\" is not registered for product \"" + productId + "\"",
                        Map.of("productId", productId.toString(), "planId", planId.toString())));
        if (!plan.getProduct().getId().equals(productId)) {
            throw new ApiError(
                    ErrorCode.PLAN_NOT_FOUND,
                    "Plan \"" + planId + "\" is not registered for product \"" + productId + "\"",
                    Map.of("productId", productId.toString(), "planId", planId.toString()));
        }
        return plan;
    }

    private Entitlement requireEntitlement(UUID productId, UUID planId, UUID entitlementId) {
        return entitlements.findByIdAndPlanId(entitlementId, planId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.ENTITLEMENT_NOT_FOUND,
                        "Entitlement \"" + entitlementId + "\" is not registered on plan \"" + planId + "\"",
                        Map.of("planId", planId.toString(), "entitlementId", entitlementId.toString())));
    }

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(AuthorizationService.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(
                    ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission,
                    Map.of("permission", permission));
        }
    }

    private void writeAudit(AuthPrincipal principal, UUID productId, UUID entitlementId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("entitlement");
        audit.setEntityId(entitlementId);
        audit.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        audit.setMetadata(toJson(metadata));
        auditEvents.save(audit);
    }

    private static String toJson(Object value) {
        try {
            return AUDIT_JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize audit metadata", e);
        }
    }

    private static EntitlementView toView(Entitlement entitlement) {
        return new EntitlementView(
                entitlement.getId().toString(),
                entitlement.getKey(),
                entitlement.getName(),
                entitlement.getValue(),
                entitlement.getStatus().name(),
                IsoTime.format(entitlement.getCreatedAt()),
                IsoTime.format(entitlement.getUpdatedAt()));
    }
}