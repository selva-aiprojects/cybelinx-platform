package com.cybelinx.platform.api.subscriptions;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.tenants.TenantViews.TenantView;
import com.cybelinx.platform.api.tenantproducts.TenantProductTransitions;
import com.cybelinx.platform.api.tenantproducts.dto.AttachTenantProductRequest;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.CreateSubscriptionResponse;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionActionResponse;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionMasterListResponse;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionMasterView;
import com.cybelinx.platform.api.subscriptions.dto.CreateSubscriptionRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Platform master subscription registry — list/create/update/remove subscriptions across tenants. */
@Service
public class SubscriptionsService {

    private final TenantProductRepository tenantProducts;
    private final TenantRepository tenants;
    private final ProductRepository products;
    private final PlanRepository plans;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final OutboxPublisher outbox;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public SubscriptionsService(
            TenantProductRepository tenantProducts,
            TenantRepository tenants,
            ProductRepository products,
            PlanRepository plans,
            UserRepository users,
            AuditEventRepository auditEvents,
            OutboxPublisher outbox) {
        this.tenantProducts = tenantProducts;
        this.tenants = tenants;
        this.products = products;
        this.plans = plans;
        this.users = users;
        this.auditEvents = auditEvents;
        this.outbox = outbox;
    }

    @Transactional(readOnly = true)
    public SubscriptionMasterListResponse listSubscriptions(AuthPrincipal principal) {
        List<SubscriptionMasterView> data =
                tenantProducts.listAllWithDetails().stream().map(SubscriptionsService::toMasterView).toList();
        return new SubscriptionMasterListResponse(data);
    }

    @Transactional
    public CreateSubscriptionResponse createSubscription(AuthPrincipal principal, CreateSubscriptionRequest request) {
        Tenant tenant = requireTenant(request.getTenantId());

        AttachTenantProductRequest attach = new AttachTenantProductRequest();
        attach.setProductCode(request.getProductCode());
        attach.setPlanCode(request.getPlanCode());
        TenantProduct tenantProduct = doAttach(principal, tenant, attach);

        if (request.getAppUrl() != null && !request.getAppUrl().isBlank()) {
            tenantProduct.setAppUrl(request.getAppUrl());
            tenantProduct = tenantProducts.save(tenantProduct);
        }

        return new CreateSubscriptionResponse(toMasterView(tenantProduct));
    }

    @Transactional
    public SubscriptionActionResponse updateStatus(
            AuthPrincipal principal, UUID tenantProductId,
            com.cybelinx.platform.api.subscriptions.dto.UpdateSubscriptionStatusRequest request) {
        TenantProduct tenantProduct = requireTenantProduct(tenantProductId);
        Tenant tenant = tenantProduct.getTenant();

        TenantProductStatus from = tenantProduct.getStatus();
        TenantProductStatus next = TenantProductTransitions.applyTransition(from, request.getStatus());
        tenantProduct.setStatus(next);
        if (next == TenantProductStatus.ACTIVE) {
            tenantProduct.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        tenantProducts.save(tenantProduct);

        writeAudit(
                principal,
                tenant.getId(),
                tenantProduct.getProduct().getId(),
                tenantProduct.getId(),
                "tenant_product.status_changed",
                TenantProductTransitions.transitionDetails(from, next));

        return new SubscriptionActionResponse(
                tenantProduct.getId().toString(),
                tenantProduct.getProduct().getProductCode(),
                tenant.getTenantCode(),
                next.name());
    }

    @Transactional
    public SubscriptionActionResponse detachSubscription(AuthPrincipal principal, UUID tenantProductId) {
        TenantProduct tenantProduct = requireTenantProduct(tenantProductId);
        Tenant tenant = tenantProduct.getTenant();

        tenantProduct.setStatus(TenantProductStatus.DISABLED);
        tenantProducts.save(tenantProduct);

        writeAudit(
                principal,
                tenant.getId(),
                tenantProduct.getProduct().getId(),
                tenantProduct.getId(),
                "tenant_product.removed",
                Map.of("productCode", tenantProduct.getProduct().getProductCode()));

        outbox.publishProductEvent(
                OutboxPublisher.PRODUCT_DISABLED,
                tenants.getReferenceById(tenant.getId()),
                tenantProduct.getProduct(),
                tenantProduct.getId(),
                Map.of("productCode", tenantProduct.getProduct().getProductCode()));

        return new SubscriptionActionResponse(
                tenantProduct.getId().toString(),
                tenantProduct.getProduct().getProductCode(),
                tenant.getTenantCode(),
                TenantProductStatus.DISABLED.name());
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private TenantProduct doAttach(
            AuthPrincipal principal, Tenant tenant, AttachTenantProductRequest attach) {
        Product product = products.findByProductCode(attach.getProductCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + attach.getProductCode() + "\" is not registered",
                        Map.of("productCode", attach.getProductCode())));
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ACTIVE,
                    "Product \"" + attach.getProductCode() + "\" is not purchasable in status \""
                            + product.getStatus() + "\"",
                    Map.of("productCode", attach.getProductCode(), "status", product.getStatus().name()));
        }

        Plan plan = resolvePlan(tenant.getId(), product, attach.getPlanCode());

        if (tenantProducts.findByTenantIdAndProductId(tenant.getId(), product.getId()).isPresent()) {
            throw new ApiError(
                    ErrorCode.TENANT_PRODUCT_ALREADY_ASSIGNED,
                    "Tenant \"" + tenant.getId() + "\" is already subscribed to product \""
                            + attach.getProductCode() + "\"",
                    Map.of("tenantId", tenant.getId().toString(), "productCode", attach.getProductCode()));
        }

        TenantProduct tenantProduct = new TenantProduct();
        tenantProduct.setTenant(tenant);
        tenantProduct.setProduct(product);
        tenantProduct.setPlan(plan);
        tenantProduct.setStatus(TenantProductStatus.ACTIVE);
        tenantProduct.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        tenantProduct.setAppUrl(buildAppUrl(tenant, product));
        tenantProduct = tenantProducts.save(tenantProduct);

        writeAudit(
                principal,
                tenant.getId(),
                product.getId(),
                tenantProduct.getId(),
                "tenant_product.created",
                Map.of("productCode", product.getProductCode(), "planCode", plan.getPlanCode()));

        outbox.publishProductEvent(
                OutboxPublisher.PRODUCT_ENABLED,
                tenants.getReferenceById(tenant.getId()),
                product,
                tenantProduct.getId(),
                Map.of("productCode", product.getProductCode(), "planCode", plan.getPlanCode()));

        return tenantProduct;
    }

    private static String buildAppUrl(Tenant tenant, Product product) {
        String baseUrl = product.getBaseUrl();
        if (baseUrl == null || baseUrl.isEmpty()) {
            baseUrl = "https://" + product.getProductCode().toLowerCase() + ".com";
        }
        String code = tenant.getTenantCode() != null ? tenant.getTenantCode().toLowerCase() : "app";
        if (baseUrl.startsWith("https://")) {
            return "https://" + code + "." + baseUrl.substring(8);
        } else if (baseUrl.startsWith("http://")) {
            return "http://" + code + "." + baseUrl.substring(7);
        }
        return "https://" + code + "." + baseUrl;
    }

    private Plan resolvePlan(UUID tenantId, Product product, String planCode) {
        Plan plan;
        if (planCode != null) {
            plan = plans.findByProductIdAndPlanCode(product.getId(), planCode)
                    .orElseThrow(() -> new ApiError(
                            ErrorCode.PLAN_NOT_FOUND,
                            "No plan \"" + planCode + "\" available for product \"" + product.getProductCode() + "\"",
                            Map.of("productCode", product.getProductCode(), "planCode", planCode)));
        } else {
            plan = plans.findFirstByProductIdAndStatusOrderByCreatedAtAsc(product.getId(), PlanStatus.ACTIVE)
                    .orElseThrow(() -> new ApiError(
                            ErrorCode.PLAN_NOT_FOUND,
                            "No default plan available for product \"" + product.getProductCode() + "\"",
                            Map.of("productCode", product.getProductCode(), "planCode", null)));
        }
        if (plan.getStatus() != PlanStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PLAN_NOT_ACTIVE,
                    "Plan \"" + plan.getPlanCode() + "\" is not purchasable in status \"" + plan.getStatus() + "\"",
                    Map.of("planCode", plan.getPlanCode(), "status", plan.getStatus().name()));
        }
        return plan;
    }

    private Tenant requireTenant(UUID tenantId) {
        Tenant tenant = tenants.findById(tenantId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_NOT_FOUND,
                        "Tenant \"" + tenantId + "\" does not exist",
                        Map.of("tenantId", tenantId.toString())));
        if (tenant.getStatus() == TenantStatus.DELETED) {
            throw new ApiError(
                    ErrorCode.TENANT_NOT_FOUND,
                    "Tenant \"" + tenantId + "\" does not exist",
                    Map.of("tenantId", tenantId.toString()));
        }
        return tenant;
    }

    private TenantProduct requireTenantProduct(UUID tenantProductId) {
        return tenantProducts.findByIdWithDetails(tenantProductId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_PRODUCT_NOT_FOUND,
                        "Subscription \"" + tenantProductId + "\" does not exist",
                        Map.of("tenantProductId", tenantProductId.toString())));
    }

    private void writeAudit(
            AuthPrincipal principal, UUID tenantId, UUID productId, UUID tenantProductId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setTenant(tenants.getReferenceById(tenantId));
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("tenant_product");
        audit.setEntityId(tenantProductId);
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

    public static SubscriptionMasterView toMasterView(TenantProduct tenantProduct) {
        return new SubscriptionMasterView(
                tenantProduct.getId().toString(),
                tenantProduct.getTenant().getId().toString(),
                tenantProduct.getProduct().getProductCode(),
                tenantProduct.getPlan().getPlanCode(),
                tenantProduct.getStatus().name(),
                IsoTime.format(tenantProduct.getActivatedAt()),
                tenantProduct.getAppUrl() != null
                        ? tenantProduct.getAppUrl()
                        : buildAppUrl(tenantProduct.getTenant(), tenantProduct.getProduct()),
                toTenantView(tenantProduct.getTenant()));
    }

    static TenantView toTenantView(Tenant tenant) {
        return new TenantView(
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getName(),
                tenant.getStatus().name(),
                tenant.getRegion() != null ? tenant.getRegion().getRegionCode() : null,
                tenant.getCountry(),
                tenant.getTimezone(),
                IsoTime.format(tenant.getCreatedAt()));
    }
}