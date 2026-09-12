package com.cybelinx.platform.api.tenants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ProvisioningJobRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.tenants.dto.CreateTenantRequest;
import com.cybelinx.platform.api.tenants.dto.TenantProductRequest;
import com.cybelinx.platform.api.tenants.dto.TenantResourceRequest;
import com.cybelinx.platform.api.tenants.dto.UpdateTenantRequest;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Port of the {@code tenant.service.spec.ts} coverage over the real (transactional) database:
 * the 8-step create flow, listing, lifecycle transitions and audit events.
 */
@SpringBootTest
@Transactional
class TenantsServiceIT {

    @Autowired private TenantsService service;
    @Autowired private TenantRepository tenants;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private ResourceCatalogRepository resources;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private ProvisioningJobRepository jobs;
    @Autowired private AuditEventRepository auditEvents;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private User platformUser;

    @BeforeEach
    void seedPlatformAdmin() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        platformUser = new User();
        platformUser.setEmail("admin-" + suffix + "@cybelinx.test");
        platformUser.setDisplayName("Platform Admin");
        platformUser = users.save(platformUser);

        Role role = roles.findByCode(TenantConstants.PLATFORM_ADMIN_ROLE).orElseGet(() -> {
            Role created = new Role();
            created.setCode(TenantConstants.PLATFORM_ADMIN_ROLE);
            created.setName("Cybelinx Platform Administrator");
            created.setScope(RoleScope.PLATFORM);
            created.setSystem(true);
            return roles.save(created);
        });

        String permissionCode = "tenant:write";
        List<UUID> existing = jdbc.query(
                "select id from permissions where code = ?", (rs, rowNum) -> rs.getObject(1, UUID.class), permissionCode);
        UUID permissionId = existing.isEmpty() ? UUID.randomUUID() : existing.get(0);
        if (existing.isEmpty()) {
            jdbc.update(
                    "insert into permissions (id, code, name, created_at, updated_at) values (?, ?, ?, now(), now())",
                    permissionId, permissionCode, "Tenant write");
        }

        Integer grantCount = jdbc.queryForObject(
                "select count(*) from role_permissions where role_id = ? and permission_id = ?",
                Integer.class, role.getId(), permissionId);
        if (grantCount == 0) {
            RolePermission grant = new RolePermission();
            grant.setRole(role);
            grant.setPermission(entityManager.getReference(
                    com.cybelinx.platform.api.persistence.entity.Permission.class, permissionId));
            rolePermissions.save(grant);
        }

        Tenant host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        TenantMembership membership = new TenantMembership();
        membership.setTenant(host);
        membership.setUser(platformUser);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        membership = memberships.save(membership);

        MembershipRole grantMembership = new MembershipRole();
        grantMembership.setMembership(membership);
        grantMembership.setRole(role);
        membershipRoles.save(grantMembership);

        seedProduct("JIOPLIX", "JioPlix");
    }

    @Test
    void createTenant_withoutResources_activatesImmediatelyAndWritesAudit() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("AUDA01");
        request.setName("Audit Trail Co");
        request.setCountry("IN");
        request.setTimezone("Asia/Kolkata");
        TenantProductRequest product = new TenantProductRequest();
        product.setProductCode("JIOPLIX");
        product.setPlanCode("BASIC");
        request.setProducts(List.of(product));

        TenantViews.CreateTenantResponse response = service.createTenant(principal(), request);

        assertThat(response.tenant().tenantCode()).isEqualTo("AUDA01");
        assertThat(response.tenant().status()).isEqualTo("ACTIVE");
        assertThat(response.tenant().country()).isEqualTo("IN");
        assertThat(response.tenant().timezone()).isEqualTo("Asia/Kolkata");
        assertThat(response.access().roles()).contains(TenantConstants.PLATFORM_ADMIN_ROLE);
        assertThat(response.access().permissions()).contains("tenant:write");
        assertThat(response.products()).singleElement().satisfies(productView -> {
            assertThat(productView.productCode()).isEqualTo("JIOPLIX");
            assertThat(productView.planCode()).isEqualTo("BASIC");
            assertThat(productView.status()).isEqualTo("ACTIVE");
            assertThat(productView.activatedAt()).isNotBlank();
        });
        assertThat(response.provisioningJobs()).isEmpty();

        List<AuditEvent> createdAudits = auditEvents.findAll().stream()
                .filter(event -> event.getAction().equals("tenant.created")
                        && event.getEntityId().equals(UUID.fromString(response.tenant().tenantId())))
                .toList();
        assertThat(createdAudits).hasSize(1);
        AuditEvent audit = createdAudits.get(0);
        assertThat(audit.getActorType()).isEqualTo("USER");
        assertThat(audit.getEntityType()).isEqualTo("tenant");
        assertThat(audit.getMetadata()).isInstanceOf(String.class);
        List<?> metadata = parseJson(audit.getMetadata(), List.class);
        assertThat(metadata).hasSize(1);
        Map<?, ?> entry = (Map<?, ?>) metadata.get(0);
        assertThat(entry.get("productCode")).isEqualTo("JIOPLIX");
        assertThat(entry.get("planCode")).isEqualTo("BASIC");
    }

    @Test
    void createTenant_withResource_queuesProvisioningJob() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("PROV10");
        request.setName("Provisioning Inc");
        TenantProductRequest product = new TenantProductRequest();
        product.setProductCode("JIOPLIX");
        TenantResourceRequest resource = new TenantResourceRequest();
        resource.setResourceTypeCode("shared_pg_instance");
        resource.setIsolationMode("SHARED_POOL");
        resource.setEnvironment("DEVELOPMENT");
        product.setResource(resource);
        request.setProducts(List.of(product));

        TenantViews.CreateTenantResponse response = service.createTenant(principal(), request);

        assertThat(response.tenant().status()).isEqualTo("PROVISIONING");
        assertThat(response.products()).singleElement().satisfies(productView -> {
            assertThat(productView.status()).isEqualTo("PROVISIONING");
            assertThat(productView.activatedAt()).isNull();
        });
        assertThat(response.provisioningJobs()).hasSize(1);
        TenantViews.ProvisioningJobView jobView = response.provisioningJobs().get(0);
        assertThat(jobView.operation()).isEqualTo("PROVISION");
        assertThat(jobView.state()).isEqualTo("IN_PROGRESS");
        assertThat(jobView.progress()).isEqualTo(10);

        UUID tenantId = UUID.fromString(response.tenant().tenantId());
        assertThat(tenantResources.listByTenantId(tenantId))
                .singleElement()
                .satisfies(tenantResource -> {
                    assertThat(tenantResource.getStatus()).isEqualTo(TenantResourceStatus.PROVISIONING);
                    assertThat(tenantResource.getProvisioningState()).isEqualTo(ProvisioningState.IN_PROGRESS);
                });
        assertThat(jobs.findByTenantIdOrderByCreatedAtDesc(tenantId))
                .singleElement()
                .satisfies(job -> {
                    assertThat(job.getOperation()).isEqualTo(ProvisioningOperation.PROVISION);
                    assertThat(job.getSteps()).hasSize(3);
                    assertThat(job.getSteps().get(0).getSequence()).isEqualTo(1);
                    assertThat(job.getSteps().get(0).getName()).isEqualTo("assign_workspace");
                    assertThat(job.getSteps().get(0).getStatus()).isEqualTo(ProvisioningStepStatus.IN_PROGRESS);
                    assertThat(job.getSteps().get(1).getSequence()).isEqualTo(2);
                    assertThat(job.getSteps().get(2).getSequence()).isEqualTo(3);
                });
    }

    @Test
    void createTenant_unknownProduct_throwsProductNotFound() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("NOPRD1");
        request.setName("No Product Co");
        TenantProductRequest product = new TenantProductRequest();
        product.setProductCode("NOT_A_PRODUCT");
        request.setProducts(List.of(product));

        assertThatThrownBy(() -> service.createTenant(principal(), request))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> {
                    ApiError apiError = (ApiError) error;
                    assertThat(apiError.getCode()).isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
                    assertThat(apiError.getStatus()).isEqualTo(404);
                    assertThat(apiError.getMessage()).isEqualTo("Product \"NOT_A_PRODUCT\" is not registered");
                });
    }

    @Test
    void createTenant_duplicateTenantCode_throwsTenantCodeTaken() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("ROOT01");
        request.setName("Duplicate Co");

        assertThatThrownBy(() -> service.createTenant(principal(), request))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> {
                    ApiError apiError = (ApiError) error;
                    assertThat(apiError.getCode()).isEqualTo(ErrorCode.TENANT_CODE_TAKEN);
                    assertThat(apiError.getStatus()).isEqualTo(409);
                    assertThat(apiError.getMessage()).isEqualTo("Tenant code \"ROOT01\" is already taken");
                });
    }

    @Test
    void listTenants_supportsSearchAndStatusFilter() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("SEARCHX");
        request.setName("Searchable Solutions");
        String tenantId = service.createTenant(principal(), request).tenant().tenantId();

        TenantViews.TenantListResponse byCode = service.listTenants(
                principal(), new TenantsService.TenantListQuery(1, 20, null, "SEARCHX", null));
        assertThat(byCode.data()).singleElement().satisfies(row -> assertThat(row.tenantId()).isEqualTo(tenantId));

        TenantViews.TenantListResponse byName = service.listTenants(
                principal(), new TenantsService.TenantListQuery(1, 20, null, "searchable", null));
        assertThat(byName.data()).singleElement().satisfies(row -> assertThat(row.name()).isEqualTo("Searchable Solutions"));

        TenantViews.TenantListResponse active = service.listTenants(
                principal(), new TenantsService.TenantListQuery(1, 20, TenantStatus.ACTIVE, null, "-createdAt"));
        assertThat(active.meta().total()).isGreaterThanOrEqualTo(2);
        assertThat(active.data()).allSatisfy(row -> assertThat(row.status()).isEqualTo("ACTIVE"));
    }

    @Test
    void listTenants_invalidPagination_isRejected() {
        assertThatThrownBy(() -> service.listTenants(
                        principal(), new TenantsService.TenantListQuery(0, 20, null, null, null)))
                .isInstanceOf(com.cybelinx.platform.api.common.error.ApiHttpException.class);

        assertThatThrownBy(() -> service.listTenants(
                        principal(), new TenantsService.TenantListQuery(1, 500, null, null, null)))
                .isInstanceOf(com.cybelinx.platform.api.common.error.ApiHttpException.class);
    }

    @Test
    void getTenant_returnsMembershipsWithRoleCodes() {
        String tenantId = service
                .createTenant(principal(), simpleRequest("DETAIL"))
                .tenant()
                .tenantId();

        TenantViews.TenantDetailResponse detail = service.getTenant(
                principal(), UUID.fromString(tenantId));

        assertThat(detail.tenant().tenantCode()).isEqualTo("DETAIL");
        assertThat(detail.memberships()).hasSize(1);
        TenantViews.TenantMembershipView membership = detail.memberships().get(0);
        assertThat(membership.userId()).isEqualTo(platformUser.getId().toString());
        assertThat(membership.status()).isEqualTo("ACTIVE");
        assertThat(membership.roleCodes()).containsExactly(TenantConstants.PLATFORM_ADMIN_ROLE);
    }

    @Test
    void updateTenant_changesFieldsAndWritesAudit() {
        String tenantId = service
                .createTenant(principal(), simpleRequest("UPDONE"))
                .tenant()
                .tenantId();

        UpdateTenantRequest update = new UpdateTenantRequest();
        update.setName("Renamed Co");
        update.setTimezone("America/New_York");
        TenantViews.TenantDetailResponse detail = service.updateTenant(
                principal(), UUID.fromString(tenantId), update);

        assertThat(detail.tenant().name()).isEqualTo("Renamed Co");
        assertThat(detail.tenant().timezone()).isEqualTo("America/New_York");

        List<AuditEvent> updated = auditEvents.findAll().stream()
                .filter(event -> event.getAction().equals("tenant.updated")
                        && event.getEntityId().equals(UUID.fromString(tenantId)))
                .toList();
        assertThat(updated).hasSize(1);
        Map<?, ?> metadata = parseJson(updated.get(0).getMetadata(), Map.class);
        assertThat((List<String>) metadata.get("fields")).contains("name", "timezone");
    }

    @Test
    void suspendAndActivate_areTransitory() {
        String tenantId = service
                .createTenant(principal(), simpleRequest("TRANS1"))
                .tenant()
                .tenantId();
        UUID id = UUID.fromString(tenantId);

        TenantViews.TenantActionResponse suspended = service.suspendTenant(principal(), id);
        assertThat(suspended.status()).isEqualTo("SUSPENDED");
        TenantViews.TenantDetailResponse detail = service.getTenant(principal(), id);
        assertThat(detail.products()).allSatisfy(product -> assertThat(product.status()).isEqualTo("SUSPENDED"));

        TenantViews.TenantActionResponse activated = service.activateTenant(principal(), id);
        assertThat(activated.status()).isEqualTo("ACTIVE");
        detail = service.getTenant(principal(), id);
        assertThat(detail.products()).allSatisfy(product -> assertThat(product.status())
                .isEqualTo(TenantProductStatus.ACTIVE.name()));
    }

    @Test
    void requestDeletion_marksDeletionPendingAndKeepsRow() {
        String tenantId = service
                .createTenant(principal(), simpleRequest("DELET1"))
                .tenant()
                .tenantId();
        UUID id = UUID.fromString(tenantId);

        TenantViews.TenantActionResponse response = service.requestDeletion(principal(), id);
        assertThat(response.status()).isEqualTo("DELETION_PENDING");
        assertThat(service.getTenant(principal(), id).tenant().status()).isEqualTo("DELETION_PENDING");
    }

    @Test
    void suspendFromNonActive_throwsTransitionInvalid() {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode("BADTRN");
        request.setName("Bad Transition Co");
        TenantProductRequest product = new TenantProductRequest();
        product.setProductCode("JIOPLIX");
        TenantResourceRequest resource = new TenantResourceRequest();
        resource.setResourceTypeCode("shared_pg_instance");
        resource.setIsolationMode("SHARED_POOL");
        resource.setEnvironment("DEVELOPMENT");
        product.setResource(resource);
        request.setProducts(List.of(product));
        UUID id = UUID.fromString(
                service.createTenant(principal(), request).tenant().tenantId());

        assertThatThrownBy(() -> service.suspendTenant(principal(), id))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> {
                    ApiError apiError = (ApiError) error;
                    assertThat(apiError.getCode()).isEqualTo(ErrorCode.TENANT_STATUS_TRANSITION_INVALID);
                    assertThat(apiError.getStatus()).isEqualTo(409);
                });

        service.requestDeletion(principal(), id);
        assertThatThrownBy(() -> service.suspendTenant(principal(), id))
                .isInstanceOf(ApiError.class);
    }

    private static <T> T parseJson(String json, Class<T> type) {
        try {
            return new ObjectMapper().readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private CreateTenantRequest simpleRequest(String tenantCode) {
        CreateTenantRequest request = new CreateTenantRequest();
        request.setTenantCode(tenantCode);
        request.setName("Company " + tenantCode);
        return request;
    }

    private AuthPrincipal principal() {
        return new AuthPrincipal(
                new AuthPrincipal.AuthUser(
                        platformUser.getId(),
                        platformUser.getEmail(),
                        platformUser.getDisplayName(),
                        "ACTIVE",
                        null,
                        null),
                new AuthPrincipal.AuthIdentity("generic", "ext-" + platformUser.getId(), platformUser.getEmail(), "Platform Admin"));
    }

    private void seedProduct(String code, String name) {
        Product product = products.findByProductCode(code).orElseGet(() -> {
            Product created = new Product();
            created.setProductCode(code);
            created.setName(name);
            return products.save(created);
        });

        Integer planCount = jdbc.queryForObject(
                "select count(*) from plans where product_id = ? and plan_code = ?",
                Integer.class, product.getId(), "BASIC");
        if (planCount == 0) {
            Plan plan = new Plan();
            plan.setProduct(entityManager.getReference(Product.class, product.getId()));
            plan.setPlanCode("BASIC");
            plan.setName("Basic");
            plan.setStatus(PlanStatus.ACTIVE);
            plans.save(plan);
        }

        resources.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            Resource resource = new Resource();
            resource.setResourceTypeCode("shared_pg_instance");
            resource.setName("Shared PostgreSQL Instance");
            return resources.save(resource);
        });
    }
}