package com.cybelinx.platform.api.tenantproducts;

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
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenants.TenantViews;
import com.cybelinx.platform.api.tenants.TenantViews.TenantProductActionResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantProductListResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantProductView;
import com.cybelinx.platform.api.tenantproducts.dto.AttachTenantProductRequest;
import com.cybelinx.platform.api.tenantproducts.dto.UpdateTenantProductStatusRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
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

/** Tenant-product subscription registry — attach/detach products, plan selection, status. */
@Service
public class TenantProductsService {

    private final TenantProductRepository tenantProducts;
    private final TenantRepository tenants;
    private final ProductRepository products;
    private final PlanRepository plans;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final OutboxPublisher outbox;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public TenantProductsService(
            TenantProductRepository tenantProducts,
            TenantRepository tenants,
            ProductRepository products,
            PlanRepository plans,
            UserRepository users,
            AuditEventRepository auditEvents,
            OutboxPublisher outbox,
            AuthorizationService authorization) {
        this.tenantProducts = tenantProducts;
        this.tenants = tenants;
        this.products = products;
        this.plans = plans;
        this.users = users;
        this.auditEvents = auditEvents;
        this.outbox = outbox;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public TenantProductListResponse listProducts(AuthPrincipal principal, UUID tenantId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);

        List<TenantProductView> data =
                tenantProducts.listByTenantId(tenantId).stream().map(TenantProductsService::toView).toList();
        return new TenantProductListResponse(data);
    }

    @Transactional
    public TenantProductView attachProduct(
            AuthPrincipal principal, UUID tenantId, AttachTenantProductRequest request) {
        Tenant tenant = requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Product product = products.findByProductCode(request.getProductCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + request.getProductCode() + "\" is not registered",
                        Map.of("productCode", request.getProductCode())));
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ACTIVE,
                    "Product \"" + request.getProductCode() + "\" is not purchasable in status \""
                            + product.getStatus() + "\"",
                    Map.of("productCode", request.getProductCode(), "status", product.getStatus().name()));
        }

        Plan plan = resolvePlan(tenantId, product, request.getPlanCode());

        if (tenantProducts.findByTenantIdAndProductId(tenantId, product.getId()).isPresent()) {
            throw new ApiError(
                    ErrorCode.TENANT_PRODUCT_ALREADY_ASSIGNED,
                    "Tenant \"" + tenantId + "\" is already subscribed to product \""
                            + request.getProductCode() + "\"",
                    Map.of("tenantId", tenantId.toString(), "productCode", request.getProductCode()));
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
                tenantId,
                product.getId(),
                tenantProduct.getId(),
                "tenant_product.created",
                Map.of("productCode", product.getProductCode(), "planCode", plan.getPlanCode()));

        outbox.publishProductEvent(
                OutboxPublisher.PRODUCT_ENABLED,
                tenant,
                product,
                tenantProduct.getId(),
                Map.of("productCode", product.getProductCode(), "planCode", plan.getPlanCode()));

        return toView(tenantProduct);
    }

    @Transactional
    public TenantProductActionResponse updateProductStatus(
            AuthPrincipal principal, UUID tenantId, UUID productId, UpdateTenantProductStatusRequest request) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        TenantProduct tenantProduct = requireTenantProduct(tenantId, productId);
        TenantProductStatus from = tenantProduct.getStatus();
        TenantProductStatus next = TenantProductTransitions.applyTransition(from, request.getStatus());
        tenantProduct.setStatus(next);
        if (next == TenantProductStatus.ACTIVE) {
            tenantProduct.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        tenantProducts.save(tenantProduct);

        writeAudit(
                principal,
                tenantId,
                productId,
                tenantProduct.getId(),
                "tenant_product.status_changed",
                TenantProductTransitions.transitionDetails(from, next));

        return new TenantProductActionResponse(
                tenantId.toString(), tenantProduct.getProduct().getProductCode(), next.name());
    }

    @Transactional
    public TenantProductActionResponse detachProduct(AuthPrincipal principal, UUID tenantId, UUID productId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        TenantProduct tenantProduct = requireTenantProduct(tenantId, productId);
        tenantProduct.setStatus(TenantProductStatus.DISABLED);
        tenantProducts.save(tenantProduct);

        writeAudit(
                principal,
                tenantId,
                productId,
                tenantProduct.getId(),
                "tenant_product.removed",
                Map.of("productCode", tenantProduct.getProduct().getProductCode()));

        outbox.publishProductEvent(
                OutboxPublisher.PRODUCT_DISABLED,
                tenants.getReferenceById(tenantId),
                tenantProduct.getProduct(),
                tenantProduct.getId(),
                Map.of("productCode", tenantProduct.getProduct().getProductCode()));

        return new TenantProductActionResponse(
                tenantId.toString(), tenantProduct.getProduct().getProductCode(), TenantProductStatus.DISABLED.name());
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

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

    private TenantProduct requireTenantProduct(UUID tenantId, UUID productId) {
        return tenantProducts.findByTenantIdAndProductId(tenantId, productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_PRODUCT_NOT_FOUND,
                        "Product \"" + productId + "\" is not subscribed by tenant \"" + tenantId + "\"",
                        Map.of("tenantId", tenantId.toString(), "productId", productId.toString())));
    }

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) {
            return;
        }
        var entry = access.stream().filter(e -> e.tenantId().equals(tenantId)).findFirst().orElse(null);
        if (entry == null || !entry.permissions().contains(permission)) {
            throw new ApiError(
                    ErrorCode.TENANT_ACCESS_DENIED,
                    "You do not have \"" + permission + "\" access on tenant \"" + tenantId + "\"",
                    Map.of("tenantId", tenantId.toString(), "permission", permission));
        }
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

    private static TenantProductView toView(TenantProduct tenantProduct) {
        return new TenantProductView(
                tenantProduct.getId().toString(),
                tenantProduct.getTenant().getId().toString(),
                tenantProduct.getProduct().getProductCode(),
                tenantProduct.getPlan().getPlanCode(),
                tenantProduct.getStatus().name(),
                IsoTime.format(tenantProduct.getActivatedAt()),
                tenantProduct.getAppUrl() != null ? tenantProduct.getAppUrl() : buildAppUrl(tenantProduct.getTenant(), tenantProduct.getProduct()));
    }
}