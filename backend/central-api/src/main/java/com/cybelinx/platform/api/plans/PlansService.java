package com.cybelinx.platform.api.plans;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.plans.PlanViews.PlanActionResponse;
import com.cybelinx.platform.api.plans.PlanViews.PlanListResponse;
import com.cybelinx.platform.api.plans.PlanViews.PlanView;
import com.cybelinx.platform.api.plans.dto.CreatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanStatusRequest;
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

/** Product plan catalog — plans are FK'd to the owning product (metadata only). */
@Service
public class PlansService {

    private final PlanRepository plans;
    private final ProductRepository products;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public PlansService(
            PlanRepository plans,
            ProductRepository products,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.plans = plans;
        this.products = products;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional
    public PlanView createPlan(AuthPrincipal principal, UUID productId, CreatePlanRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);
        Product product = requireProduct(productId);

        if (plans.findByProductIdAndPlanCode(productId, request.getPlanCode()).isPresent()) {
            throw new ApiError(
                    ErrorCode.PLAN_CODE_TAKEN,
                    "Plan code \"" + request.getPlanCode() + "\" already exists for this product",
                    Map.of("productId", productId.toString(), "planCode", request.getPlanCode()));
        }

        Plan plan = new Plan();
        plan.setProduct(product);
        plan.setPlanCode(request.getPlanCode());
        plan.setName(request.getName());
        plan.setDescription(request.getDescription());
        plan.setStatus(PlanStatus.DRAFT);
        plan.setTrialDays(request.getTrialDays());
        plan = plans.save(plan);

        writeAudit(principal, product.getId(), plan.getId(), "plan.created", Map.of("planCode", plan.getPlanCode()));

        return toView(plan);
    }

    @Transactional(readOnly = true)
    public PlanListResponse listPlans(AuthPrincipal principal, UUID productId, PlanStatus status) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        requireProduct(productId);

        List<PlanView> data = (status == null
                        ? plans.findByProductIdOrderByCreatedAtAsc(productId)
                        : plans.findByProductIdAndStatusOrderByCreatedAtAsc(productId, status))
                .stream()
                .map(PlansService::toView)
                .toList();
        return new PlanListResponse(data);
    }

    @Transactional(readOnly = true)
    public PlanView getPlan(AuthPrincipal principal, UUID productId, UUID planId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        return toView(requirePlan(productId, planId));
    }

    @Transactional
    public PlanView updatePlan(AuthPrincipal principal, UUID productId, UUID planId, UpdatePlanRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Plan plan = requirePlan(productId, planId);
        List<String> fields = new ArrayList<>();
        if (request.getName() != null) {
            plan.setName(request.getName());
            fields.add("name");
        }
        if (request.getDescription() != null) {
            plan.setDescription(request.getDescription());
            fields.add("description");
        }
        if (request.getTrialDays() != null) {
            plan.setTrialDays(request.getTrialDays());
            fields.add("trialDays");
        }
        plans.save(plan);

        writeAudit(principal, productId, plan.getId(), "plan.updated", Map.of("fields", fields));

        return toView(plan);
    }

    @Transactional
    public PlanActionResponse updatePlanStatus(
            AuthPrincipal principal, UUID productId, UUID planId, UpdatePlanStatusRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Plan plan = requirePlan(productId, planId);
        PlanStatus from = plan.getStatus();
        PlanStatus next = PlanTransitions.applyTransition(from, request.getStatus());
        plan.setStatus(next);
        plans.save(plan);

        writeAudit(principal, productId, plan.getId(), "plan.status_changed", PlanTransitions.transitionDetails(from, next));

        return new PlanActionResponse(plan.getId().toString(), next.name());
    }

    @Transactional(readOnly = true)
    public Plan requirePlan(UUID productId, UUID planId) {
        return plans.findByIdAndProductId(planId, productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PLAN_NOT_FOUND,
                        "Plan \"" + planId + "\" is not registered for product \"" + productId + "\"",
                        Map.of("productId", productId.toString(), "planId", planId.toString())));
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private Product requireProduct(UUID productId) {
        return products.findById(productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + productId + "\" is not registered",
                        Map.of("productId", productId.toString())));
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

    private void writeAudit(AuthPrincipal principal, UUID productId, UUID planId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("plan");
        audit.setEntityId(planId);
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

    private static PlanView toView(Plan plan) {
        return new PlanView(
                plan.getId().toString(),
                plan.getPlanCode(),
                plan.getName(),
                plan.getDescription(),
                plan.getStatus().name(),
                plan.getTrialDays(),
                IsoTime.format(plan.getCreatedAt()),
                IsoTime.format(plan.getUpdatedAt()));
    }
}