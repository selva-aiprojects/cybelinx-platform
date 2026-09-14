package com.cybelinx.platform.api.tenants;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.common.time.IsoTime;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ProvisioningJobRepository;
import com.cybelinx.platform.api.persistence.RegionRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.persistence.entity.Region;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.tenants.TenantViews.AccessView;
import com.cybelinx.platform.api.tenants.TenantViews.CreateTenantResponse;
import com.cybelinx.platform.api.tenants.TenantViews.Meta;
import com.cybelinx.platform.api.tenants.TenantViews.ProvisioningJobView;
import com.cybelinx.platform.api.tenants.TenantViews.TenantActionResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantDetailResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantListResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantMembershipView;
import com.cybelinx.platform.api.tenants.TenantViews.TenantProductView;
import com.cybelinx.platform.api.tenants.TenantViews.TenantResourceView;
import com.cybelinx.platform.api.tenants.TenantViews.TenantView;
import com.cybelinx.platform.api.tenants.dto.CreateTenantRequest;
import com.cybelinx.platform.api.tenants.dto.TenantProductRequest;
import com.cybelinx.platform.api.tenants.dto.TenantResourceRequest;
import com.cybelinx.platform.api.tenants.dto.UpdateTenantRequest;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Port of {@code TenantsService}: metadata-only tenant registry with the 8-step transactional
 * create flow, guarded lifecycle transitions and soft (deferred) deletion.
 */
@Service
public class TenantsService {

    private final TenantRepository tenants;
    private final TenantMembershipRepository memberships;
    private final MembershipRoleRepository membershipRoles;
    private final RoleRepository roles;
    private final RolePermissionRepository rolePermissions;
    private final RegionRepository regions;
    private final ProductRepository products;
    private final PlanRepository plans;
    private final ResourceCatalogRepository resources;
    private final TenantProductRepository tenantProducts;
    private final TenantResourceRepository tenantResources;
    private final ProvisioningJobRepository provisioningJobs;
    private final AuditEventRepository auditEvents;
    private final OutboxPublisher outbox;
    private final UserRepository users;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public TenantsService(
            TenantRepository tenants,
            TenantMembershipRepository memberships,
            MembershipRoleRepository membershipRoles,
            RoleRepository roles,
            RolePermissionRepository rolePermissions,
            RegionRepository regions,
            ProductRepository products,
            PlanRepository plans,
            ResourceCatalogRepository resources,
            TenantProductRepository tenantProducts,
            TenantResourceRepository tenantResources,
            ProvisioningJobRepository provisioningJobs,
            AuditEventRepository auditEvents,
            OutboxPublisher outbox,
            UserRepository users,
            AuthorizationService authorization) {
        this.tenants = tenants;
        this.memberships = memberships;
        this.membershipRoles = membershipRoles;
        this.roles = roles;
        this.rolePermissions = rolePermissions;
        this.regions = regions;
        this.products = products;
        this.plans = plans;
        this.resources = resources;
        this.tenantProducts = tenantProducts;
        this.tenantResources = tenantResources;
        this.provisioningJobs = provisioningJobs;
        this.auditEvents = auditEvents;
        this.outbox = outbox;
        this.users = users;
        this.authorization = authorization;
    }

    @Transactional
    public CreateTenantResponse createTenant(AuthPrincipal principal, CreateTenantRequest request) {
        // 1. Creating a tenant is a platform-wide privileged action.
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_WRITE);

        // 2. Create the canonical tenant.
        UUID regionId = resolveRegionId(request.getRegionCode());
        if (tenants.findByTenantCode(request.getTenantCode()).isPresent()) {
            throw new ApiError(
                    ErrorCode.TENANT_CODE_TAKEN,
                    "Tenant code \"" + request.getTenantCode() + "\" is already taken",
                    Map.of("tenantCode", request.getTenantCode()));
        }
        Tenant tenant = new Tenant();
        tenant.setTenantCode(request.getTenantCode());
        tenant.setName(request.getName());
        tenant.setStatus(TenantStatus.PROVISIONING);
        if (regionId != null) {
            tenant.setRegion(regions.getReferenceById(regionId));
        }
        tenant.setCountry(request.getCountry());
        tenant.setTimezone(request.getTimezone());
        tenant = tenants.save(tenant);

        // 3. Create the initial membership (creator joins immediately).
        TenantMembership membership = new TenantMembership();
        membership.setTenant(tenant);
        membership.setUser(users.getReferenceById(principal.user().id()));
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        membership = memberships.save(membership);

        // 4. Assign the platform administrator role.
        Role role = requireRole(TenantConstants.PLATFORM_ADMIN_ROLE);
        MembershipRole grant = new MembershipRole();
        grant.setMembership(membership);
        grant.setRole(role);
        membershipRoles.save(grant);
        List<String> permissionCodes = rolePermissions.findPermissionCodesForRole(role.getId());

        // 5. Create the requested product relationships (metadata only).
        ResolvedProducts resolved = resolveProducts(tenant.getId(), request.getProducts());

        // 6. Queue provisioning jobs when resources are required.
        List<ProvisioningJob> jobs = queueProvisioningJobs(tenant.getId(), principal.user().id());

        // Everything active → go live; anything awaiting provisioning stays PROVISIONING.
        TenantStatus finalStatus = resolved.needsProvisioning ? TenantStatus.PROVISIONING : TenantStatus.ACTIVE;
        Tenant activeTenant = tenant;
        if (finalStatus != tenant.getStatus()) {
            tenant.setStatus(finalStatus);
            activeTenant = tenants.save(tenant);
        }

        // 7. Write the audit event.
        AuditEvent audit = buildAudit(
                tenant.getId(), principal.user().id(), "tenant.created", toAuditProducts(request.getProducts()));
        audit.setEntityId(tenant.getId());
        auditEvents.save(audit);

        // 7b. Emit the transactional outbox event (TRD section 22).
        outbox.publishTenantEvent(OutboxPublisher.TENANT_CREATED, activeTenant, Map.of(
                "tenantCode", activeTenant.getTenantCode(),
                "name", activeTenant.getName(),
                "status", activeTenant.getStatus().name()));

        // 8. Return tenant context information.
        return new CreateTenantResponse(
                toTenantView(activeTenant),
                new AccessView(
                        principal.user().id().toString(),
                        activeTenant.getId().toString(),
                        membership.getId().toString(),
                        List.of(role.getCode()),
                        List.copyOf(permissionCodes)),
                resolved.productRelationships.stream().map(TenantsService::toProductView).toList(),
                jobs.stream().map(TenantsService::toJobView).toList());
    }

    @Transactional(readOnly = true)
    public TenantListResponse listTenants(AuthPrincipal principal, TenantListQuery query) {
        assertPlatformPermission(principal.user().id(), TenantConstants.PERMISSION_TENANT_READ);

        int page = query.page() != null ? query.page() : 1;
        int limit = query.limit() != null ? query.limit() : 20;
        if (page < 1) {
            throw ApiHttpException.badRequest("page must not be less than 1");
        }
        if (limit < 1) {
            throw ApiHttpException.badRequest("limit must not be less than 1");
        }
        if (limit > 100) {
            throw ApiHttpException.badRequest("limit must not be greater than 100");
        }
        if (query.search() != null && query.search().length() > 100) {
            throw ApiHttpException.badRequest("search must not exceed 100 characters");
        }

        String sort = query.sort() != null ? query.sort() : TenantConstants.DEFAULT_SORT;
        if (!List.of(TenantConstants.SORT_KEYS).contains(sort)) {
            throw ApiHttpException.badRequest(
                    "sort must be one of the following values: createdAt, -createdAt, name, -name, tenantCode, -tenantCode");
        }

        Specification<Tenant> where = buildListWhere(query.status(), query.search());
        boolean desc = sort.startsWith("-");
        String key = desc ? sort.substring(1) : sort;
        Pageable pageable =
                PageRequest.of(page - 1, limit, Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, key));

        Page<Tenant> result = tenants.findAll(where, pageable);
        List<TenantView> data = result.getContent().stream().map(TenantsService::toTenantView).toList();
        return new TenantListResponse(data, new Meta(page, limit, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional
    public TenantDetailResponse getTenant(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        return composeDetail(tenantId);
    }

    @Transactional
    public TenantDetailResponse updateTenant(AuthPrincipal principal, UUID tenantId, UpdateTenantRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Tenant tenant = requireTenant(tenantId);
        List<String> fields = new ArrayList<>();

        if (request.getName() != null) {
            tenant.setName(request.getName());
            fields.add("name");
        }
        if (request.getRegionCode() != null) {
            UUID regionId = resolveRegionId(request.getRegionCode());
            if (regionId != null) {
                tenant.setRegion(regions.getReferenceById(regionId));
            } else {
                tenant.setRegion(null);
            }
            fields.add("regionCode");
        }
        if (request.getCountry() != null) {
            tenant.setCountry(request.getCountry());
            fields.add("country");
        }
        if (request.getTimezone() != null) {
            tenant.setTimezone(request.getTimezone());
            fields.add("timezone");
        }
        tenants.save(tenant);

        AuditEvent audit = buildAudit(tenantId, principal.user().id(), "tenant.updated", Map.of("fields", fields));
        audit.setEntityId(tenantId);
        auditEvents.save(audit);

        return composeDetail(tenantId);
    }

    @Transactional
    public TenantActionResponse suspendTenant(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Tenant tenant = requireTenant(tenantId);
        TenantStatus next = TenantTransitions.applyTransition(TenantTransitions.TenantRule.suspend, tenant.getStatus());
        tenant.setStatus(next);
        tenants.save(tenant);
        tenantProducts.updateStatusByTenantId(tenantId, TenantProductStatus.SUSPENDED);
        writeAudit(principal, tenantId, "tenant.suspended");
        outbox.publishTenantEvent(OutboxPublisher.TENANT_SUSPENDED, tenant, Map.of("status", next.name()));

        return new TenantActionResponse(tenantId.toString(), next.name());
    }

    @Transactional
    public TenantActionResponse activateTenant(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Tenant tenant = requireTenant(tenantId);
        TenantStatus next = TenantTransitions.applyTransition(TenantTransitions.TenantRule.activate, tenant.getStatus());
        tenant.setStatus(next);
        tenants.save(tenant);

        List<TenantProduct> suspended = tenantProducts.listByTenantId(tenantId).stream()
                .filter(product -> product.getStatus() == TenantProductStatus.SUSPENDED)
                .toList();
        tenantProducts.updateStatusByTenantId(tenantId, TenantProductStatus.ACTIVE);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (TenantProduct product : suspended) {
            if (product.getActivatedAt() == null) {
                tenantProducts.updateStatusAndActivatedAt(product.getId(), TenantProductStatus.ACTIVE, now);
            }
        }
        writeAudit(principal, tenantId, "tenant.activated");
        outbox.publishTenantEvent(OutboxPublisher.TENANT_ACTIVATED, tenant, Map.of("status", next.name()));

        return new TenantActionResponse(tenantId.toString(), next.name());
    }

    @Transactional
    public TenantActionResponse requestDeletion(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Tenant tenant = requireTenant(tenantId);
        TenantStatus next =
                TenantTransitions.applyTransition(TenantTransitions.TenantRule.markDeletionPending, tenant.getStatus());
        tenant.setStatus(next);
        tenants.save(tenant);
        writeAudit(principal, tenantId, "tenant.deletion_requested");
        outbox.publishTenantEvent(OutboxPublisher.TENANT_DEACTIVATED, tenant, Map.of("status", next.name()));

        return new TenantActionResponse(tenantId.toString(), next.name());
    }

    @Transactional
    public TenantActionResponse finalizeDeletion(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Tenant tenant = requireTenant(tenantId);
        TenantStatus next =
                TenantTransitions.applyTransition(TenantTransitions.TenantRule.finalizeDeletion, tenant.getStatus());
        tenant.setStatus(next);
        tenants.save(tenant);
        tenantProducts.updateStatusByTenantId(tenantId, TenantProductStatus.DISABLED);
        writeAudit(principal, tenantId, "tenant.deletion_finalized");
        outbox.publishTenantEvent(OutboxPublisher.TENANT_DELETED, tenant, Map.of("status", next.name()));

        return new TenantActionResponse(tenantId.toString(), next.name());
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private TenantDetailResponse composeDetail(UUID tenantId) {
        Tenant tenant = requireTenant(tenantId);

        List<TenantProductView> products =
                tenantProducts.listByTenantId(tenantId).stream().map(TenantsService::toProductView).toList();
        List<TenantResourceView> resources = tenantResources.listByTenantId(tenantId).stream()
                .map(TenantsService::toResourceView)
                .toList();
        List<ProvisioningJobView> jobs = provisioningJobs.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(TenantsService::toJobView)
                .toList();
        List<TenantMembershipView> memberViews = toMembershipViews(tenantId);

        return new TenantDetailResponse(toTenantView(tenant), products, resources, jobs, memberViews);
    }

    private List<TenantMembershipView> toMembershipViews(UUID tenantId) {
        List<Object[]> rows = memberships.listByTenantWithRoleCodes(tenantId);
        List<TenantMembershipView> views = new ArrayList<>();
        MembershipAccumulator acc = new MembershipAccumulator();
        for (Object[] row : rows) {
            TenantMembership membership = (TenantMembership) row[0];
            String roleCode = (String) row[1];
            if (acc.membershipId != null && !acc.membershipId.equals(membership.getId())) {
                views.add(acc.build());
                acc = new MembershipAccumulator();
            }
            if (acc.membershipId == null) {
                acc.membershipId = membership.getId();
                acc.tenantId = tenantId;
                acc.userId = membership.getUser().getId();
                acc.status = membership.getStatus().name();
                acc.joinedAt = IsoTime.format(membership.getJoinedAt());
            }
            if (roleCode != null) {
                acc.roleCodes.add(roleCode);
            }
        }
        if (acc.membershipId != null) {
            views.add(acc.build());
        }
        return views;
    }

    private static final class MembershipAccumulator {
        private UUID membershipId;
        private UUID tenantId;
        private UUID userId;
        private String status;
        private String joinedAt;
        private final List<String> roleCodes = new ArrayList<>();

        private TenantMembershipView build() {
            return new TenantMembershipView(
                    membershipId.toString(),
                    tenantId.toString(),
                    userId.toString(),
                    status,
                    List.copyOf(roleCodes),
                    joinedAt);
        }
    }

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(
                    ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission,
                    Map.of("permission", permission));
        }
    }

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin =
                access.stream().anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
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

    private UUID resolveRegionId(String regionCode) {
        if (regionCode == null || regionCode.isBlank()) {
            return null;
        }
        Region region = regions.findByRegionCode(regionCode).orElseThrow(
                () -> new ApiError(
                        ErrorCode.REGION_NOT_FOUND,
                        "Region \"" + regionCode + "\" is not registered",
                        Map.of("regionCode", regionCode)));
        return region.getId();
    }

    private Role requireRole(String code) {
        return roles.findByCode(code)
                .orElseThrow(() -> new ApiError(ErrorCode.INTERNAL_ERROR, "System role \"" + code + "\" is not seeded"));
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

    private ResolvedProducts resolveProducts(UUID tenantId, List<TenantProductRequest> requestedList) {
        boolean needsProvisioning = false;
        List<TenantProduct> relationships = new ArrayList<>();
        for (TenantProductRequest requested : requestedList == null ? List.<TenantProductRequest>of() : requestedList) {
            Product product = products.findByProductCode(requested.getProductCode())
                    .orElseThrow(() -> new ApiError(
                            ErrorCode.PRODUCT_NOT_FOUND,
                            "Product \"" + requested.getProductCode() + "\" is not registered",
                            Map.of("productCode", requested.getProductCode())));

            Plan plan;
            if (requested.getPlanCode() != null) {
                plan = plans.findByProductIdAndPlanCode(product.getId(), requested.getPlanCode())
                        .orElseThrow(() -> new ApiError(
                                ErrorCode.PLAN_NOT_FOUND,
                                "No plan \"" + requested.getPlanCode() + "\" available for product \""
                                        + requested.getProductCode() + "\"",
                                Map.of("productCode", requested.getProductCode(), "planCode", requested.getPlanCode())));
            } else {
                plan = plans.findFirstByProductIdAndStatusOrderByCreatedAtAsc(product.getId(), PlanStatus.ACTIVE)
                        .orElseThrow(() -> new ApiError(
                                ErrorCode.PLAN_NOT_FOUND,
                                "No default plan available for product \"" + requested.getProductCode() + "\"",
                                Map.of("productCode", requested.getProductCode(), "planCode", null)));
            }

            boolean requiresProvisioning = requested.getResource() != null;
            TenantProduct tenantProduct = new TenantProduct();
            tenantProduct.setTenant(tenants.getReferenceById(tenantId));
            tenantProduct.setProduct(product);
            tenantProduct.setPlan(plan);
            tenantProduct.setStatus(requiresProvisioning ? TenantProductStatus.PROVISIONING : TenantProductStatus.ACTIVE);
            tenantProduct.setActivatedAt(requiresProvisioning ? null : LocalDateTime.now(ZoneOffset.UTC));
            tenantProduct = tenantProducts.save(tenantProduct);
            relationships.add(tenantProduct);

            if (requested.getResource() != null) {
                resolveResource(tenantId, product.getId(), tenantProduct.getId(), requested.getResource());
            }
            needsProvisioning = needsProvisioning || requiresProvisioning;
        }
        return new ResolvedProducts(needsProvisioning, relationships);
    }

    private void resolveResource(UUID tenantId, UUID productId, UUID tenantProductId, TenantResourceRequest resource) {
        Resource catalog = resources.findByResourceTypeCode(resource.getResourceTypeCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Resource type \"" + resource.getResourceTypeCode() + "\" is not registered",
                        Map.of("resourceTypeCode", resource.getResourceTypeCode())));

        TenantResource tenantResource = new TenantResource();
        tenantResource.setTenant(tenants.getReferenceById(tenantId));
        tenantResource.setProduct(products.getReferenceById(productId));
        tenantResource.setTenantProduct(tenantProducts.getReferenceById(tenantProductId));
        tenantResource.setResource(catalog);
        tenantResource.setIsolationMode(
                IsolationMode.valueOf(resource.getIsolationMode() != null ? resource.getIsolationMode() : "SHARED_POOL"));
        tenantResource.setEnvironment(Environment.valueOf(
                resource.getEnvironment() != null ? resource.getEnvironment() : "DEVELOPMENT"));
        tenantResource.setStatus(TenantResourceStatus.PROVISIONING);
        tenantResource.setProvisioningState(ProvisioningState.IN_PROGRESS);
        tenantResources.save(tenantResource);
    }

    private List<ProvisioningJob> queueProvisioningJobs(UUID tenantId, UUID requestedById) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<ProvisioningJob> jobs = new ArrayList<>();
        for (TenantResource resource : tenantResources.listByTenantId(tenantId)) {
            ProvisioningJob job = new ProvisioningJob();
            job.setTenant(tenants.getReferenceById(tenantId));
            job.setTenantProduct(resource.getTenantProduct());
            job.setTenantResource(resource);
            job.setOperation(ProvisioningOperation.PROVISION);
            job.setState(ProvisioningState.IN_PROGRESS);
            job.setProgress(10);
            job.setRequestedBy(users.getReferenceById(requestedById));
            job.setQueuedAt(now);
            job.setStartedAt(now);
            job.getSteps().add(step(1, "assign_workspace", ProvisioningStepStatus.IN_PROGRESS, now, job));
            job.getSteps().add(step(2, "verify_connectivity", ProvisioningStepStatus.PENDING, null, job));
            job.getSteps().add(step(3, "finalize_credentials", ProvisioningStepStatus.PENDING, null, job));
            jobs.add(provisioningJobs.save(job));
        }
        return jobs;
    }

    private static ProvisioningStep step(int sequence, String name, ProvisioningStepStatus status, LocalDateTime startedAt, ProvisioningJob job) {
        ProvisioningStep step = new ProvisioningStep();
        step.setJob(job);
        step.setSequence(sequence);
        step.setName(name);
        step.setStatus(status);
        step.setStartedAt(startedAt);
        return step;
    }

    private void writeAudit(AuthPrincipal principal, UUID tenantId, String action) {
        AuditEvent audit = buildAudit(tenantId, principal.user().id(), action);
        audit.setEntityId(tenantId);
        auditEvents.save(audit);
    }

    private AuditEvent buildAudit(UUID tenantId, UUID userId, String action) {
        return buildAudit(tenantId, userId, action, null);
    }

    private AuditEvent buildAudit(UUID tenantId, UUID userId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setTenant(tenants.getReferenceById(tenantId));
        audit.setUser(users.getReferenceById(userId));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("tenant");
        audit.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        audit.setMetadata(metadata == null ? null : toJson(metadata));
        return audit;
    }

    private static String toJson(Object value) {
        try {
            return AUDIT_JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize audit metadata", e);
        }
    }

    // ---------------------------------------------------------------------
    // Mappers
    // ---------------------------------------------------------------------

    private static TenantView toTenantView(Tenant tenant) {
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

    private static TenantProductView toProductView(TenantProduct product) {
        return new TenantProductView(
                product.getId().toString(),
                product.getTenant().getId().toString(),
                product.getProduct() != null ? product.getProduct().getProductCode() : "",
                product.getPlan() != null ? product.getPlan().getPlanCode() : "",
                product.getStatus().name(),
                IsoTime.format(product.getActivatedAt()),
                product.getAppUrl() != null ? product.getAppUrl() : buildAppUrl(product.getTenant(), product.getProduct()));
    }

    private static String buildAppUrl(Tenant tenant, Product product) {
        if (product == null) return null;
        String baseUrl = product.getBaseUrl();
        if (baseUrl == null || baseUrl.isEmpty()) {
            baseUrl = "https://" + product.getProductCode().toLowerCase() + ".com";
        }
        String code = tenant != null && tenant.getTenantCode() != null ? tenant.getTenantCode().toLowerCase() : "app";
        if (baseUrl.startsWith("https://")) {
            return "https://" + code + "." + baseUrl.substring(8);
        } else if (baseUrl.startsWith("http://")) {
            return "http://" + code + "." + baseUrl.substring(7);
        }
        return "https://" + code + "." + baseUrl;
    }

    private static TenantResourceView toResourceView(TenantResource resource) {
        return new TenantResourceView(
                resource.getId().toString(),
                resource.getTenant().getId().toString(),
                resource.getProduct() != null ? resource.getProduct().getProductCode() : "",
                resource.getResource() != null ? resource.getResource().getResourceTypeCode() : "",
                resource.getIsolationMode().name(),
                resource.getEnvironment().name(),
                resource.getStatus().name(),
                resource.getProvisioningState().name());
    }

    private static ProvisioningJobView toJobView(ProvisioningJob job) {
        return new ProvisioningJobView(
                job.getId().toString(),
                job.getTenant().getId().toString(),
                job.getOperation().name(),
                job.getState().name(),
                job.getProgress());
    }

    private static List<Map<String, Object>> toAuditProducts(List<TenantProductRequest> products) {
        List<Map<String, Object>> maps = new ArrayList<>();
        for (TenantProductRequest p : products == null ? List.<TenantProductRequest>of() : products) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("productCode", p.getProductCode());
            entry.put("planCode", p.getPlanCode());
            entry.put("resource", p.getResource() == null ? null : resourceAuditValue(p.getResource()));
            maps.add(entry);
        }
        return maps;
    }

    private static Map<String, Object> resourceAuditValue(TenantResourceRequest resource) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("resourceTypeCode", resource.getResourceTypeCode());
        value.put("isolationMode", resource.getIsolationMode());
        value.put("environment", resource.getEnvironment());
        return value;
    }

    private static Specification<Tenant> buildListWhere(TenantStatus status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isEmpty()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("tenantCode")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** Query params for {@code GET /tenants}. */
    public record TenantListQuery(Integer page, Integer limit, TenantStatus status, String search, String sort) {}

    private record ResolvedProducts(boolean needsProvisioning, List<TenantProduct> productRelationships) {}
}