package com.cybelinx.platform.api.onboarding.service;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.email.EmailNotificationService;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.onboarding.adapter.GenericDynamicProductAdapter;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapter;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapterRegistry;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardStatusView;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RegionRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Universal onboarding orchestration service for all products across the Cybelinx SaaS platform.
 * Employs {@link ProductAdapterRegistry} to remain completely decoupled from specific product schemas.
 */
@Service
public class GenericProductOnboardingService {

    public static final String DEFAULT_RESOURCE_TYPE = "POSTGRES_SCHEMA";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ProductAdapterRegistry adapterRegistry;
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
    private final EmailNotificationService emailNotificationService;
    private final TransactionTemplate transactionTemplate;

    public GenericProductOnboardingService(
            ProductAdapterRegistry adapterRegistry,
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
            AuditEventRepository auditEvents,
            OutboxPublisher outbox,
            AuthorizationService authorization,
            EmailNotificationService emailNotificationService,
            PlatformTransactionManager transactionManager) {
        this.adapterRegistry = adapterRegistry;
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
        this.emailNotificationService = emailNotificationService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional
    public GenericOnboardResponse onboardTenant(AuthPrincipal principal, GenericOnboardRequest request) {
        if (principal != null && principal.user() != null) {
            assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);
        }
        return doOnboardTenant(principal, request);
    }

    private GenericOnboardResponse doOnboardTenant(AuthPrincipal principal, GenericOnboardRequest request) {
        GenericOnboardRequest normalizedRequest = normalize(request);
        Product product = products.findByProductCode(normalizedRequest.productCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product not found in catalog: " + normalizedRequest.productCode(),
                        Map.of("productCode", normalizedRequest.productCode())));

        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ACTIVE,
                    "Product " + normalizedRequest.productCode() + " is not active",
                    Map.of("productCode", normalizedRequest.productCode(), "status", product.getStatus().name()));
        }

        ProductAdapter adapter = adapterRegistry.findAdapter(normalizedRequest.productCode())
                .orElseGet(() -> new GenericDynamicProductAdapter(product));
        adapter.validateCustomFields(normalizedRequest);

        String productCode = product.getProductCode();
        String provider = adapter.getDefaultProvider();
        List<String> executedSteps = new ArrayList<>();

        // Step 1: Idempotency check for external identifier
        Optional<TenantExternalIdentifier> existingMapping =
                externalIds.findByProduct_IdAndProviderAndExternalId(product.getId(), provider, normalizedRequest.externalId());

        if (existingMapping.isPresent()) {
            Tenant existingTenant = existingMapping.get().getTenant();
            TenantProduct tp = tenantProducts.findByTenantIdAndProductId(existingTenant.getId(), product.getId())
                    .orElse(null);
            List<TenantResource> trs = tenantResources.listByTenantId(existingTenant.getId());
            String schemaName = trs.stream()
                    .filter(r -> r.getProduct().getId().equals(product.getId()))
                    .map(TenantResource::getSchemaName)
                    .findFirst()
                    .orElse("NONE");
            String resourceStatus = trs.stream()
                    .filter(r -> r.getProduct().getId().equals(product.getId()))
                    .map(r -> r.getStatus().name())
                    .findFirst()
                    .orElse("NONE");

            return new GenericOnboardResponse(
                    existingTenant.getId().toString(),
                    existingTenant.getTenantCode(),
                    existingTenant.getName(),
                    product.getProductCode(),
                    tp != null && tp.getPlan() != null ? tp.getPlan().getPlanCode() : adapter.getDefaultPlanCode(),
                    normalizedRequest.externalId(),
                    provider,
                    "ALREADY_ONBOARDED",
                    existingTenant.getStatus().name(),
                    resourceStatus,
                    schemaName,
                    "Tenant with external identifier " + normalizedRequest.externalId() + " is already onboarded into Cybelinx platform",
                    IsoTime.format(existingMapping.get().getCreatedAt()),
                    List.of("IDEMPOTENT_LOOKUP")
            );
        }

        // Resolve every catalog dependency before changing tenant state. This prevents a bad
        // plan, region, or resource request from creating a half-onboarded tenant.
        String planCode = normalizedRequest.planCode() != null
                ? normalizedRequest.planCode()
                : adapter.getDefaultPlanCode();
        Plan plan = plans.findByProductIdAndPlanCode(product.getId(), planCode)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PLAN_NOT_FOUND,
                        "Plan not found: " + planCode + " for product " + productCode,
                        Map.of("productCode", productCode, "planCode", planCode)));
        if (plan.getStatus() != PlanStatus.ACTIVE) {
            throw new ApiError(ErrorCode.PLAN_NOT_ACTIVE, "Plan " + planCode + " is not active",
                    Map.of("planCode", planCode, "status", plan.getStatus().name()));
        }

        Region targetRegion = resolveRegion(normalizedRequest.regionCode());
        Resource resourceType = resourceCatalog.findByResourceTypeCode(DEFAULT_RESOURCE_TYPE)
                .orElseThrow(() -> new ApiError(ErrorCode.RESOURCE_NOT_FOUND,
                        "Required resource type is not registered: " + DEFAULT_RESOURCE_TYPE,
                        Map.of("resourceTypeCode", DEFAULT_RESOURCE_TYPE)));
        Environment env = parseEnvironment(normalizedRequest.environment());
        IsolationMode isolationMode = parseIsolationMode(normalizedRequest.isolationMode());
        String finalSchemaName = adapter.computeSchemaName(tenantCode(normalizedRequest.tenantCode()), normalizedRequest.schemaName());
        validateSchemaName(finalSchemaName);

        // Step 2: Resolve or create canonical Tenant
        Tenant tenant;
        Optional<Tenant> tenantOpt = tenants.findByTenantCode(normalizedRequest.tenantCode());
        if (tenantOpt.isPresent()) {
            tenant = tenantOpt.get();
            if (tenant.getStatus() == TenantStatus.DELETED) {
                throw new ApiError(
                        ErrorCode.TENANT_CODE_TAKEN,
                        "Tenant code " + normalizedRequest.tenantCode() + " belongs to a deleted tenant",
                        Map.of("tenantCode", normalizedRequest.tenantCode()));
            }
        } else {
            tenant = new Tenant();
            tenant.setTenantCode(normalizedRequest.tenantCode());
            tenant.setName(normalizedRequest.tenantName());
            tenant.setStatus(TenantStatus.ACTIVE);
            tenant.setRegion(targetRegion);
            tenant = tenants.save(tenant);

            outbox.publishTenantEvent("TENANT_CREATED", tenant, Map.of(
                    "tenant_code", tenant.getTenantCode(),
                    "name", tenant.getName(),
                    "region_code", targetRegion.getRegionCode()
            ));
        }
        executedSteps.add("VALIDATE_TENANT");

        // Step 2b: Auto-provision Tenant Admin Identity & Membership
        if (normalizedRequest.adminEmail() != null) {
            String adminEmail = normalizedRequest.adminEmail();
            final String tenantDisplayName = tenant.getName();
            User adminUser = users.findByEmail(adminEmail).orElseGet(() -> {
                User nu = new User();
                nu.setEmail(adminEmail);
                nu.setDisplayName(normalizedRequest.adminName() != null
                        ? normalizedRequest.adminName()
                        : (tenantDisplayName + " Admin"));
                nu.setStatus(com.cybelinx.platform.api.domain.UserStatus.ACTIVE);
                return users.save(nu);
            });

            final Tenant finalTenant = tenant;
            TenantMembership tm = memberships.findByTenant_IdAndUser_Id(tenant.getId(), adminUser.getId()).orElseGet(() -> {
                TenantMembership m = new TenantMembership();
                m.setTenant(finalTenant);
                m.setUser(adminUser);
                m.setStatus(MembershipStatus.ACTIVE);
                return memberships.save(m);
            });

            roles.findByCode(TenantConstants.TENANT_ADMIN_ROLE).ifPresent(r -> {
                boolean hasRole = membershipRoles.findByMembership_Id(tm.getId()).stream()
                        .anyMatch(mr -> mr.getRole().getCode().equalsIgnoreCase(TenantConstants.TENANT_ADMIN_ROLE));
                if (!hasRole) {
                    MembershipRole mr = new MembershipRole();
                    mr.setMembership(tm);
                    mr.setRole(r);
                    membershipRoles.save(mr);
                }
            });
            executedSteps.add("PROVISION_TENANT_ADMIN");
        }

        // Step 3: Register external identifier mapping
        TenantExternalIdentifier externalIdMapping = new TenantExternalIdentifier();
        externalIdMapping.setTenant(tenant);
        externalIdMapping.setProduct(product);
        externalIdMapping.setProvider(provider);
        externalIdMapping.setExternalId(normalizedRequest.externalId());
        externalIdMapping = externalIds.save(externalIdMapping);
        executedSteps.add("MAP_EXTERNAL_ID");

        // Step 4: Resolve plan & attach product subscription
        Optional<TenantProduct> existingTp = tenantProducts.findByTenantIdAndProductId(tenant.getId(), product.getId());
        TenantProduct tenantProduct;
        if (existingTp.isPresent()) {
            tenantProduct = existingTp.get();
        } else {
            tenantProduct = new TenantProduct();
            tenantProduct.setTenant(tenant);
            tenantProduct.setProduct(product);
            tenantProduct.setPlan(plan);
            tenantProduct.setStatus(TenantProductStatus.ACTIVE);
            tenantProduct.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
            tenantProduct = tenantProducts.save(tenantProduct);

            Map<String, Object> productPayload = new HashMap<>(adapter.enrichOutboxPayload(tenant, normalizedRequest));
            productPayload.put("plan_code", plan.getPlanCode());
            outbox.publishProductEvent("PRODUCT_ENABLED", tenant, product, tenantProduct.getId(), productPayload);
        }
        executedSteps.add("ATTACH_SUBSCRIPTION");

        // Step 5: Provision resource & Schema Isolation
        {
            boolean resourceExists = tenantResources.existsByTenantIdAndProductIdAndEnvironmentAndResourceId(
                    tenant.getId(), product.getId(), env, resourceType.getId());

            if (!resourceExists) {
                TenantResource tr = new TenantResource();
                tr.setTenant(tenant);
                tr.setProduct(product);
                tr.setResource(resourceType);
                tr.setEnvironment(env);
                tr.setIsolationMode(isolationMode);
                tr.setSchemaName(finalSchemaName);
                tr.setTenantProduct(tenantProduct);
                tr.setStatus(TenantResourceStatus.PROVISIONING);
                tr.setProvisioningState(com.cybelinx.platform.api.domain.ProvisioningState.PENDING);
                tr = tenantResources.save(tr);

                outbox.publishResourceEvent("RESOURCE_CREATED", tenant, product, tr.getId(), Map.of(
                        "productCode", product.getProductCode(),
                        "provider", provider,
                        "tenantCode", tenant.getTenantCode(),
                        "resourceType", resourceType.getResourceTypeCode(),
                        "environment", env.name(),
                        "isolationMode", isolationMode.name(),
                        "schemaResourceName", tr.getSchemaName()
                ));
            }
        }
        executedSteps.add("PROVISION_SCHEMA");
        executedSteps.add("EMIT_OUTBOX_EVENT");

        // Step 6: Initial User & Admin membership setup if provided
        if (normalizedRequest.adminEmail() != null) {
            setupAdminMembership(tenant, normalizedRequest.adminEmail(), normalizedRequest.adminName());
        }

        // Step 7: Audit Event Log
        UUID actorUserId = (principal != null && principal.user() != null) ? principal.user().id() : null;
        writeAuditEvent(actorUserId, tenant, product, "product.tenant.onboarded", Map.of(
                "product_code", productCode,
                "external_id", normalizedRequest.externalId(),
                "provider", provider,
                "tenant_code", tenant.getTenantCode(),
                "plan_code", plan.getPlanCode(),
                "schema_name", finalSchemaName
        ));

        GenericOnboardResponse response = new GenericOnboardResponse(
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getName(),
                product.getProductCode(),
                plan.getPlanCode(),
                normalizedRequest.externalId(),
                provider,
                "SUCCESS",
                tenant.getStatus().name(),
                "PROVISIONING",
                finalSchemaName,
                "Tenant successfully onboarded into Cybelinx SaaS platform for " + product.getName(),
                IsoTime.format(externalIdMapping.getCreatedAt()),
                executedSteps
        );

        if (emailNotificationService != null) {
            dispatchEmailsAfterCommit(normalizedRequest, response);
        }

        return response;
    }

    @Transactional
    public GenericBatchOnboardResponse batchOnboard(AuthPrincipal principal, GenericBatchOnboardRequest request) {
        if (principal != null && principal.user() != null) {
            assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);
        }

        List<GenericOnboardResponse> results = new ArrayList<>();
        int succeeded = 0;
        int failed = 0;

        for (GenericOnboardRequest item : request.items()) {
            try {
            GenericOnboardResponse resp = transactionTemplate.execute(status -> doOnboardTenant(principal, item));
                results.add(resp);
                succeeded++;
            } catch (Exception ex) {
                failed++;
                results.add(new GenericOnboardResponse(
                        null,
                        item.tenantCode(),
                        item.tenantName(),
                        item.productCode(),
                        item.planCode(),
                        item.externalId(),
                        null,
                        "FAILED",
                        "ERROR",
                        "NONE",
                        null,
                        ex.getMessage(),
                        IsoTime.format(LocalDateTime.now(ZoneOffset.UTC)),
                        List.of("ERROR: " + ex.getMessage())
                ));
            }
        }

        return new GenericBatchOnboardResponse(request.items().size(), succeeded, failed, results);
    }

    @Transactional(readOnly = true)
    public GenericOnboardStatusView getOnboardingStatus(AuthPrincipal principal, String productCode, String externalId) {
        if (principal != null && principal.user() != null) {
            assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_READ);
        }

        ProductAdapter adapter = adapterRegistry.getRequiredAdapter(productCode);
        Product product = products.findByProductCode(adapter.getProductCode())
                .orElseThrow(() -> new ApiError(ErrorCode.PRODUCT_NOT_FOUND, "Product not found: " + productCode, Map.of()));

        TenantExternalIdentifier mapping = externalIds
                .findByProduct_IdAndProviderAndExternalId(product.getId(), adapter.getDefaultProvider(), externalId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.EXTERNAL_ID_NOT_FOUND,
                        "External ID mapping not found for " + productCode + " tenant: " + externalId,
                        Map.of("externalId", externalId, "provider", adapter.getDefaultProvider())));

        Tenant tenant = mapping.getTenant();
        TenantProduct tp = tenantProducts.findByTenantIdAndProductId(tenant.getId(), product.getId()).orElse(null);
        List<TenantResource> resources = tenantResources.listByTenantId(tenant.getId());

        TenantResource primaryResource = resources.stream()
                .filter(r -> r.getProduct().getId().equals(product.getId()))
                .findFirst()
                .orElse(null);

        return new GenericOnboardStatusView(
                mapping.getExternalId(),
                mapping.getProvider(),
                product.getProductCode(),
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getName(),
                tenant.getStatus().name(),
                tp != null ? tp.getStatus().name() : "NOT_SUBSCRIBED",
                tp != null && tp.getPlan() != null ? tp.getPlan().getPlanCode() : null,
                primaryResource != null ? primaryResource.getStatus().name() : "NONE",
                primaryResource != null ? primaryResource.getSchemaName() : null,
                primaryResource != null && primaryResource.getIsolationMode() != null ? primaryResource.getIsolationMode().name() : "SCHEMA_PER_TENANT",
                IsoTime.format(mapping.getCreatedAt())
        );
    }

    // ── Internal Helpers ────────────────────────────────────────────────────────

    private void assertPlatformPermission(UUID userId, String permission) {
        if (userId == null) return;
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

    private Region resolveRegion(String requestedRegionCode) {
        if (requestedRegionCode != null) {
            return regions.findByRegionCode(requestedRegionCode)
                    .orElseThrow(() -> new ApiError(ErrorCode.REGION_NOT_FOUND,
                            "Region not found: " + requestedRegionCode,
                            Map.of("regionCode", requestedRegionCode)));
        }
        return regions.findAll().stream().findFirst()
                .orElseThrow(() -> new ApiError(ErrorCode.REGION_NOT_FOUND, "No region found in catalog", Map.of()));
    }

    private void dispatchEmailsAfterCommit(GenericOnboardRequest request, GenericOnboardResponse response) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            emailNotificationService.dispatchOnboardingEmails(request, response);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                emailNotificationService.dispatchOnboardingEmails(request, response);
            }
        });
    }

    private static Environment parseEnvironment(String value) {
        if (value == null) return Environment.DEVELOPMENT;
        try { return Environment.valueOf(value); }
        catch (IllegalArgumentException ex) { throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid environment: " + value, Map.of("environment", value)); }
    }

    private static IsolationMode parseIsolationMode(String value) {
        if (value == null) return IsolationMode.SCHEMA_PER_TENANT;
        try { return IsolationMode.valueOf(value); }
        catch (IllegalArgumentException ex) { throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid isolationMode: " + value, Map.of("isolationMode", value)); }
    }

    private static void validateSchemaName(String value) {
        if (value == null || !value.matches("^[a-z][a-z0-9_]{0,62}$")) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR,
                    "schemaName must start with a lowercase letter and contain only lowercase letters, digits, and underscores (max 63 characters)",
                    Map.of("schemaName", value == null ? "" : value));
        }
    }

    private static GenericOnboardRequest normalize(GenericOnboardRequest request) {
        return new GenericOnboardRequest(
                required(request.productCode(), "productCode").toUpperCase(),
                required(request.externalId(), "externalId"),
                tenantCode(required(request.tenantCode(), "tenantCode")),
                required(request.tenantName(), "tenantName"),
                optionalUpper(request.planCode()), optional(request.domain()), optionalEmail(request.adminEmail()), optional(request.adminName()),
                optional(request.adminUserId()), optionalUpper(request.isolationMode()), optionalUpper(request.environment()),
                optional(request.schemaName()), optionalLower(request.regionCode()), request.customFields() == null ? Map.of() : request.customFields());
    }

    private static String tenantCode(String value) {
        String normalized = value.trim().toUpperCase();
        if (!normalized.matches("^[A-Z][A-Z0-9_]{1,63}$")) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR,
                    "tenantCode must be 2-64 characters of uppercase letters, digits, or underscores and start with a letter",
                    Map.of("tenantCode", value));
        }
        return normalized;
    }
    private static String required(String value, String field) {
        String normalized = optional(value);
        if (normalized == null) throw new ApiError(ErrorCode.VALIDATION_ERROR, field + " must not be blank", Map.of("field", field));
        return normalized;
    }
    private static String optional(String value) { return value == null || value.trim().isEmpty() ? null : value.trim(); }
    private static String optionalUpper(String value) { String normalized = optional(value); return normalized == null ? null : normalized.toUpperCase(); }
    private static String optionalLower(String value) { String normalized = optional(value); return normalized == null ? null : normalized.toLowerCase(); }
    private static String optionalEmail(String value) { String normalized = optional(value); return normalized == null ? null : normalized.toLowerCase(); }

    private void setupAdminMembership(Tenant tenant, String adminEmail, String adminName) {
        User user = users.findByEmail(adminEmail).orElseGet(() -> {
            User u = new User();
            u.setEmail(adminEmail);
            u.setDisplayName(adminName != null && !adminName.isBlank() ? adminName : adminEmail);
            return users.save(u);
        });

        if (memberships.findByTenant_IdAndUser_Id(tenant.getId(), user.getId()).isEmpty()) {
            TenantMembership tm = new TenantMembership();
            tm.setTenant(tenant);
            tm.setUser(user);
            tm.setStatus(MembershipStatus.ACTIVE);
            tm = memberships.save(tm);

            Optional<Role> tenantAdminRole = roles.findByCode(TenantConstants.TENANT_ADMIN_ROLE);
            if (tenantAdminRole.isPresent()) {
                boolean hasRole = membershipRoles.findByMembership_Id(tm.getId()).stream()
                        .anyMatch(mr -> mr.getRole().getCode().equalsIgnoreCase(TenantConstants.TENANT_ADMIN_ROLE));
                if (!hasRole) {
                    MembershipRole mr = new MembershipRole();
                    mr.setMembership(tm);
                    mr.setRole(tenantAdminRole.get());
                    membershipRoles.save(mr);
                }
            }
        }
    }

    private void writeAuditEvent(UUID actorUserId, Tenant tenant, Product product, String action, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        if (actorUserId != null) {
            users.findById(actorUserId).ifPresent(event::setUser);
        }
        event.setTenant(tenant);
        event.setProduct(product);
        event.setActorType("USER");
        event.setEntityType("tenant_onboarding");
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
