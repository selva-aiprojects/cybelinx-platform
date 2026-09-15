package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.NewStoreSignupRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.SingleStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreAiOnboardingResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreOnboardStatusView;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RegionRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantExternalIdentifierRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Region;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service orchestrating formal onboarding of StoreAI Composable Commerce retail merchant customers into the Cybelinx SaaS Platform.
 */
@Service
public class StoreAiOnboardingService {

    public static final String PRODUCT_STOREAI = "STOREAI";
    public static final String PROVIDER_STOREAI_NEXUS = "STOREAI_NEXUS";
    public static final String DEFAULT_PLAN_STOREAI = "STOREAI_ENTERPRISE";
    public static final String DEFAULT_RESOURCE_TYPE = "POSTGRES_SCHEMA";

    private final TenantRepository tenants;
    private final ProductRepository products;
    private final PlanRepository plans;
    private final TenantProductRepository tenantProducts;
    private final TenantResourceRepository tenantResources;
    private final TenantExternalIdentifierRepository externalIds;
    private final ResourceCatalogRepository resourceCatalog;
    private final RegionRepository regions;
    private final UserRepository users;
    private final TenantMembershipRepository memberships;
    private final RoleRepository roles;
    private final MembershipRoleRepository membershipRoles;
    private final AuditEventRepository auditEvents;
    private final OutboxPublisher outbox;
    private final AuthorizationService authorization;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public StoreAiOnboardingService(
            TenantRepository tenants,
            ProductRepository products,
            PlanRepository plans,
            TenantProductRepository tenantProducts,
            TenantResourceRepository tenantResources,
            TenantExternalIdentifierRepository externalIds,
            ResourceCatalogRepository resourceCatalog,
            RegionRepository regions,
            UserRepository users,
            TenantMembershipRepository memberships,
            RoleRepository roles,
            MembershipRoleRepository membershipRoles,
            RolePermissionRepository rolePermissions,
            AuditEventRepository auditEvents,
            OutboxPublisher outbox,
            AuthorizationService authorization) {
        this.tenants = tenants;
        this.products = products;
        this.plans = plans;
        this.tenantProducts = tenantProducts;
        this.tenantResources = tenantResources;
        this.externalIds = externalIds;
        this.resourceCatalog = resourceCatalog;
        this.regions = regions;
        this.users = users;
        this.memberships = memberships;
        this.roles = roles;
        this.membershipRoles = membershipRoles;
        this.auditEvents = auditEvents;
        this.outbox = outbox;
        this.authorization = authorization;
    }

    @Transactional
    public StoreAiOnboardingResponse onboardExistingStore(AuthPrincipal principal, SingleStoreOnboardRequest request) {
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);

        Product product = products.findByProductCode(PRODUCT_STOREAI)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product not found: " + PRODUCT_STOREAI,
                        Map.of("productCode", PRODUCT_STOREAI)));

        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ACTIVE,
                    "Product " + PRODUCT_STOREAI + " is not active",
                    Map.of("productCode", PRODUCT_STOREAI, "status", product.getStatus().name()));
        }

        // Idempotency check for external ID
        Optional<TenantExternalIdentifier> existingMapping =
                externalIds.findByProduct_IdAndProviderAndExternalId(product.getId(), PROVIDER_STOREAI_NEXUS, request.externalId());

        if (existingMapping.isPresent()) {
            Tenant existingTenant = existingMapping.get().getTenant();
            TenantProduct tp = tenantProducts.findByTenantIdAndProductId(existingTenant.getId(), product.getId())
                    .orElse(null);
            return new StoreAiOnboardingResponse(
                    existingTenant.getId().toString(),
                    existingTenant.getTenantCode(),
                    existingTenant.getName(),
                    product.getProductCode(),
                    tp != null && tp.getPlan() != null ? tp.getPlan().getPlanCode() : DEFAULT_PLAN_STOREAI,
                    request.externalId(),
                    PROVIDER_STOREAI_NEXUS,
                    "ALREADY_ONBOARDED",
                    existingTenant.getStatus().name(),
                    "Store merchant " + request.externalId() + " is already onboarded to Cybelinx platform",
                    IsoTime.format(existingMapping.get().getCreatedAt())
            );
        }

        // 1. Resolve or create canonical Tenant
        Tenant tenant;
        Optional<Tenant> tenantOpt = tenants.findByTenantCode(request.tenantCode());
        if (tenantOpt.isPresent()) {
            tenant = tenantOpt.get();
        } else {
            Region defaultRegion = regions.findAll().stream().findFirst()
                    .orElseThrow(() -> new ApiError(ErrorCode.REGION_NOT_FOUND, "No region found in catalog", Map.of()));
            tenant = new Tenant();
            tenant.setTenantCode(request.tenantCode());
            tenant.setName(request.storeName());
            tenant.setStatus(TenantStatus.ACTIVE);
            tenant.setRegion(defaultRegion);
            tenant = tenants.save(tenant);

            outbox.publishTenantEvent("TENANT_CREATED", tenant, Map.of(
                    "tenant_code", tenant.getTenantCode(),
                    "name", tenant.getName(),
                    "region_code", defaultRegion.getRegionCode()
            ));
        }

        // 2. Map external identifier
        TenantExternalIdentifier externalIdMapping = new TenantExternalIdentifier();
        externalIdMapping.setTenant(tenant);
        externalIdMapping.setProduct(product);
        externalIdMapping.setProvider(PROVIDER_STOREAI_NEXUS);
        externalIdMapping.setExternalId(request.externalId());
        externalIdMapping = externalIds.save(externalIdMapping);

        // 3. Resolve plan & attach product subscription
        String planCode = request.planCode() != null && !request.planCode().isBlank()
                ? request.planCode()
                : DEFAULT_PLAN_STOREAI;

        Plan plan = plans.findByProductIdAndPlanCode(product.getId(), planCode)
                .orElse(plans.findAll().stream().filter(p -> p.getProduct().getId().equals(product.getId())).findFirst().orElse(null));

        if (plan != null) {
            Optional<TenantProduct> existingTp = tenantProducts.findByTenantIdAndProductId(tenant.getId(), product.getId());
            if (existingTp.isEmpty()) {
                TenantProduct tenantProduct = new TenantProduct();
                tenantProduct.setTenant(tenant);
                tenantProduct.setProduct(product);
                tenantProduct.setPlan(plan);
                tenantProduct.setStatus(TenantProductStatus.ACTIVE);
                tenantProduct.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
                tenantProducts.save(tenantProduct);

                outbox.publishProductEvent("PRODUCT_ENABLED", tenant, product, tenantProduct.getId(), Map.of(
                        "product_code", product.getProductCode(),
                        "plan_code", plan.getPlanCode(),
                        "external_id", request.externalId()
                ));
            }
        }

        // 4. Register tenant resource & isolation mode
        Environment env = Environment.PRODUCTION;
        IsolationMode isolationMode = IsolationMode.SCHEMA_PER_TENANT;
        Resource resourceType = resourceCatalog.findByResourceTypeCode(DEFAULT_RESOURCE_TYPE)
                .orElse(resourceCatalog.findAll().stream().findFirst().orElse(null));

        if (resourceType != null) {
            boolean resourceExists = tenantResources.existsByTenantIdAndProductIdAndEnvironmentAndResourceId(
                    tenant.getId(), product.getId(), env, resourceType.getId());

            if (!resourceExists) {
                TenantResource tr = new TenantResource();
                tr.setTenant(tenant);
                tr.setProduct(product);
                tr.setResource(resourceType);
                tr.setEnvironment(env);
                tr.setIsolationMode(isolationMode);
                String cleanCode = tenant.getTenantCode().toLowerCase().replaceAll("[^a-z0-9_]", "_");
                tr.setSchemaName(request.schemaName() != null && !request.schemaName().isBlank() ? request.schemaName() : "storeai_" + cleanCode);
                tr.setStatus(TenantResourceStatus.ACTIVE);
                tenantResources.save(tr);
            }
        }

        // 5. User & admin membership setup
        if (request.merchantEmail() != null && !request.merchantEmail().isBlank()) {
            setupMerchantMembership(tenant, request.merchantEmail());
        }

        // 6. Audit event
        writeAuditEvent(principal.user().id(), tenant, product, "storeai.merchant.onboarded", Map.of(
                "external_id", request.externalId(),
                "provider", PROVIDER_STOREAI_NEXUS,
                "tenant_code", tenant.getTenantCode()
        ));

        return new StoreAiOnboardingResponse(
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getName(),
                product.getProductCode(),
                plan != null ? plan.getPlanCode() : DEFAULT_PLAN_STOREAI,
                request.externalId(),
                PROVIDER_STOREAI_NEXUS,
                "SUCCESS",
                tenant.getStatus().name(),
                "StoreAI retail merchant " + request.externalId() + " successfully onboarded into SaaS platform",
                IsoTime.format(externalIdMapping.getCreatedAt())
        );
    }

    @Transactional
    public BatchStoreOnboardResponse onboardBatch(AuthPrincipal principal, BatchStoreOnboardRequest request) {
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);

        List<StoreAiOnboardingResponse> results = new ArrayList<>();
        int succeeded = 0;
        int failed = 0;

        for (SingleStoreOnboardRequest req : request.stores()) {
            try {
                StoreAiOnboardingResponse resp = onboardExistingStore(principal, req);
                results.add(resp);
                if ("SUCCESS".equalsIgnoreCase(resp.status()) || "ALREADY_ONBOARDED".equalsIgnoreCase(resp.status())) {
                    succeeded++;
                } else {
                    failed++;
                }
            } catch (Exception ex) {
                failed++;
                results.add(new StoreAiOnboardingResponse(
                        null,
                        req.tenantCode(),
                        req.storeName(),
                        PRODUCT_STOREAI,
                        req.planCode(),
                        req.externalId(),
                        PROVIDER_STOREAI_NEXUS,
                        "FAILED",
                        "ERROR",
                        "Failed to onboard merchant: " + ex.getMessage(),
                        IsoTime.format(LocalDateTime.now(ZoneOffset.UTC))
                ));
            }
        }

        return new BatchStoreOnboardResponse(request.stores().size(), succeeded, failed, results);
    }

    @Transactional
    public StoreAiOnboardingResponse signupNewStore(AuthPrincipal principal, NewStoreSignupRequest request) {
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);

        String autoExternalId = "store_auto_" + UUID.randomUUID().toString().substring(0, 8);
        SingleStoreOnboardRequest req = new SingleStoreOnboardRequest(
                autoExternalId,
                request.merchantName(),
                request.merchantCode(),
                request.planCode(),
                null,
                request.merchantEmail(),
                null,
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                null
        );
        return onboardExistingStore(principal, req);
    }

    @Transactional(readOnly = true)
    public StoreOnboardStatusView getOnboardingStatusByExternalId(AuthPrincipal principal, String externalId) {
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_READ);

        Product product = products.findByProductCode(PRODUCT_STOREAI)
                .orElseThrow(() -> new ApiError(ErrorCode.PRODUCT_NOT_FOUND, "Product not found: " + PRODUCT_STOREAI, Map.of()));

        TenantExternalIdentifier mapping = externalIds
                .findByProduct_IdAndProviderAndExternalId(product.getId(), PROVIDER_STOREAI_NEXUS, externalId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.EXTERNAL_ID_NOT_FOUND,
                        "External ID mapping not found for StoreAI merchant: " + externalId,
                        Map.of("externalId", externalId, "provider", PROVIDER_STOREAI_NEXUS)));

        Tenant tenant = mapping.getTenant();
        TenantProduct tp = tenantProducts.findByTenantIdAndProductId(tenant.getId(), product.getId()).orElse(null);
        List<TenantResource> resources = tenantResources.listByTenantId(tenant.getId());

        String resourceStatus = resources.stream()
                .filter(r -> r.getProduct().getId().equals(product.getId()))
                .map(r -> r.getStatus().name())
                .findFirst()
                .orElse("NONE");

        return new StoreOnboardStatusView(
                mapping.getExternalId(),
                mapping.getProvider(),
                product.getProductCode(),
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getStatus().name(),
                tp != null ? tp.getStatus().name() : "NOT_SUBSCRIBED",
                resourceStatus,
                IsoTime.format(mapping.getCreatedAt())
        );
    }

    private void assertPlatformPermission(UUID userId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(userId);
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) return;

        boolean hasPerm = access.stream()
                .flatMap(entry -> entry.permissions().stream())
                .anyMatch(p -> p.equals(permission));
        if (!hasPerm) {
            throw new ApiError(
                    ErrorCode.TENANT_ACCESS_DENIED,
                    "Platform permission required: " + permission,
                    Map.of("permission", permission));
        }
    }

    private void setupMerchantMembership(Tenant tenant, String merchantEmail) {
        User user = users.findByEmail(merchantEmail).orElseGet(() -> {
            User u = new User();
            u.setEmail(merchantEmail);
            u.setDisplayName(merchantEmail);
            return users.save(u);
        });

        if (memberships.findByTenant_IdAndUser_Id(tenant.getId(), user.getId()).isEmpty()) {
            TenantMembership tm = new TenantMembership();
            tm.setTenant(tenant);
            tm.setUser(user);
            tm.setStatus(MembershipStatus.ACTIVE);
            tm = memberships.save(tm);

            Optional<Role> adminRole = roles.findByCode(TenantConstants.PLATFORM_ADMIN_ROLE);
            if (adminRole.isPresent()) {
                MembershipRole mr = new MembershipRole();
                mr.setMembership(tm);
                mr.setRole(adminRole.get());
                membershipRoles.save(mr);
            }
        }
    }

    private void writeAuditEvent(UUID actorUserId, Tenant tenant, Product product, String action, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        users.findById(actorUserId).ifPresent(event::setUser);
        event.setTenant(tenant);
        event.setProduct(product);
        event.setActorType("USER");
        event.setEntityType("storeai_onboarding");
        event.setEntityId(tenant != null ? tenant.getId() : null);
        event.setAction(action);
        try {
            event.setMetadata(MAPPER.writeValueAsString(metadata));
        } catch (JsonProcessingException e) {
            event.setMetadata("{}");
        }
        auditEvents.save(event);
    }
}
