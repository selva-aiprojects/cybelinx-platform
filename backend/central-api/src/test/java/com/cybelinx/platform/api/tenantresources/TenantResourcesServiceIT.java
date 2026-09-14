package com.cybelinx.platform.api.tenantresources;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Permission;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenantresources.dto.RegisterTenantResourceRequest;
import com.cybelinx.platform.api.tenantresources.dto.UpdateTenantResourceRequest;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Integration coverage for the tenant resource registry. */
@SpringBootTest
@Transactional
class TenantResourcesServiceIT {

    @Autowired private TenantResourcesService service;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private ResourceCatalogRepository catalog;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User operator;
    private User viewer;
    private Tenant host;
    private Product product;
    private TenantProduct subscription;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role operatorRole = upsertRole("TR_OPERATOR", "Resource Operator");
        Role viewerRole = upsertRole("TR_VIEWER", "Resource Viewer");
        grant(operatorRole, TenantConstants.PERMISSION_TENANT_READ);
        grant(operatorRole, TenantConstants.PERMISSION_TENANT_WRITE);
        grant(viewerRole, TenantConstants.PERMISSION_TENANT_READ);

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("tradmin-");
        membership(platformAdmin, adminRole);
        operator = user("troperator-");
        membership(operator, operatorRole);
        viewer = user("trviewer-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("TR_" + suffix);
        product.setName("Resource Product");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);

        Plan plan = new Plan();
        plan.setProduct(product);
        plan.setPlanCode("BASIC");
        plan.setName("Basic");
        plan.setStatus(PlanStatus.ACTIVE);
        plan = plans.save(plan);

        subscription = new TenantProduct();
        subscription.setTenant(host);
        subscription.setProduct(product);
        subscription.setPlan(plan);
        subscription.setStatus(com.cybelinx.platform.api.domain.TenantProductStatus.ACTIVE);
        subscription.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        subscription = tenantProducts.save(subscription);

        Resource catalogEntry = catalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            Resource created = new Resource();
            created.setResourceTypeCode("shared_pg_instance");
            created.setName("Shared PostgreSQL Instance");
            return catalog.save(created);
        });
    }

    @Test
    void register_createsResourceWithDefaultsAndAudits() {
        var view = service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));

        assertThat(view.productCode()).isEqualTo("TR_" + suffix);
        assertThat(view.resourceTypeCode()).isEqualTo("shared_pg_instance");
        assertThat(view.isolationMode()).isEqualTo("SHARED_POOL");
        assertThat(view.environment()).isEqualTo("DEVELOPMENT");
        assertThat(view.status()).isEqualTo("PROVISIONING");
        assertThat(view.provisioningState()).isEqualTo("IN_PROGRESS");
        assertThat(auditCount("tenant_resource.created", UUID.fromString(view.tenantResourceId()))).isEqualTo(1);
    }

    @Test
    void register_customIsolationAndEnvironment() {
        var view = service.registerResource(
                principalFor(platformAdmin),
                host.getId(),
                register("TR_" + suffix, "shared_pg_instance", "SCHEMA_PER_TENANT", "PRODUCTION"));

        assertThat(view.isolationMode()).isEqualTo("SCHEMA_PER_TENANT");
        assertThat(view.environment()).isEqualTo("PRODUCTION");
    }

    @Test
    void register_duplicate_throwsAlreadyRegistered() {
        service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));

        assertThatThrownBy(() -> service.registerResource(
                        principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_RESOURCE_ALREADY_REGISTERED));
    }

    @Test
    void register_sameProductDifferentEnvironment_ok() {
        service.registerResource(
                principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, "DEVELOPMENT"));
        var second = service.registerResource(
                principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, "PRODUCTION"));

        assertThat(second.environment()).isEqualTo("PRODUCTION");
    }

    @Test
    void register_unknownProduct_throwsProductNotFound() {
        assertThatThrownBy(() -> service.registerResource(
                        principalFor(platformAdmin), host.getId(), register("NOPE_" + suffix, "shared_pg_instance", null, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void register_productNotSubscribed_throwsTenantProductNotFound() {
        Tenant other = new Tenant();
        other.setTenantCode("NO2_" + suffix);
        other.setName("No Subscription");
        other.setStatus(TenantStatus.ACTIVE);
        Tenant noSubscription = tenants.save(other);

        assertThatThrownBy(() -> service.registerResource(
                        principalFor(platformAdmin),
                        noSubscription.getId(),
                        register("TR_" + suffix, "shared_pg_instance", null, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_PRODUCT_NOT_FOUND));
    }

    @Test
    void register_unknownResourceType_throwsResourceNotFound() {
        assertThatThrownBy(() -> service.registerResource(
                        principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "no_such_resource", null, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void register_missingPermission_throwsTenantAccessDenied() {
        assertThatThrownBy(() -> service.registerResource(
                        principalFor(viewer), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    @Test
    void register_operatorWithTenantWrite_succeeds() {
        var view = service.registerResource(principalFor(operator), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));
        assertThat(view.status()).isEqualTo("PROVISIONING");
    }

    @Test
    void listResources_returnsRegisteredWithProductCode() {
        service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, "DEVELOPMENT"));
        service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, "PRODUCTION"));

        var result = service.listResources(principalFor(platformAdmin), host.getId());
        assertThat(result.data()).hasSize(2);
        assertThat(result.data())
                .extracting(com.cybelinx.platform.api.tenants.TenantViews.TenantResourceView::productCode)
                .contains("TR_" + suffix, "TR_" + suffix);
    }

    @Test
    void getResource_returnsDetail() {
        var registered = service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));

        var view = service.getResource(principalFor(platformAdmin), host.getId(), UUID.fromString(registered.tenantResourceId()));
        assertThat(view.resourceTypeCode()).isEqualTo("shared_pg_instance");
    }

    @Test
    void getResource_unknown_throwsNotFound() {
        assertThatThrownBy(() -> service.getResource(principalFor(platformAdmin), host.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_RESOURCE_NOT_FOUND));
    }

    @Test
    void updateResource_updatesFieldsAndAudits() {
        var registered = service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));

        UpdateTenantResourceRequest request = new UpdateTenantResourceRequest();
        request.setSchemaName("cyb_prod_schema");
        request.setMigrationVersion("V3");
        request.setCredentialReference("secret/ref");
        UUID id = UUID.fromString(registered.tenantResourceId());
        var view = service.updateResource(principalFor(platformAdmin), host.getId(), id, request);

        assertThat(view.status()).isEqualTo("PROVISIONING");
        assertThat(auditCount("tenant_resource.updated", id)).isEqualTo(1);
    }

    @Test
    void updateResource_noChanges_skipsAudit() {
        var registered = service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));

        UpdateTenantResourceRequest request = new UpdateTenantResourceRequest();
        service.updateResource(principalFor(platformAdmin), host.getId(), UUID.fromString(registered.tenantResourceId()), request);

        assertThat(auditCount("tenant_resource.updated", UUID.fromString(registered.tenantResourceId()))).isEqualTo(0);
    }

    @Test
    void removeResource_retiresAndAudits() {
        var registered = service.registerResource(principalFor(platformAdmin), host.getId(), register("TR_" + suffix, "shared_pg_instance", null, null));
        UUID id = UUID.fromString(registered.tenantResourceId());

        var response = service.removeResource(principalFor(platformAdmin), host.getId(), id);
        assertThat(response.status()).isEqualTo("RETIRED");
        assertThat(auditCount("tenant_resource.removed", id)).isEqualTo(1);

        var view = service.getResource(principalFor(platformAdmin), host.getId(), id);
        assertThat(view.status()).isEqualTo("RETIRED");
        assertThat(view.provisioningState()).isEqualTo("ROLLED_BACK");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private int auditCount(String action, UUID entityId) {
        entityManager.flush();
        Integer count = jdbc.queryForObject(
                "select count(*) from audit_events where action = ? and entity_id = ?",
                Integer.class,
                action,
                entityId);
        return count == null ? 0 : count;
    }

    private static RegisterTenantResourceRequest register(String productCode, String resourceTypeCode, String isolationMode, String environment) {
        RegisterTenantResourceRequest request = new RegisterTenantResourceRequest();
        request.setProductCode(productCode);
        request.setResourceTypeCode(resourceTypeCode);
        request.setIsolationMode(isolationMode);
        request.setEnvironment(environment);
        return request;
    }

    private AuthPrincipal principalFor(User user) {
        return new AuthPrincipal(
                new AuthPrincipal.AuthUser(
                        user.getId(), user.getEmail(), user.getDisplayName(), "ACTIVE", null, null),
                new AuthPrincipal.AuthIdentity(
                        "generic", "ext-" + user.getId(), user.getEmail(), user.getDisplayName()));
    }

    private User user(String prefix) {
        User user = new User();
        user.setEmail(prefix + suffix.toLowerCase() + "@cybelinx.test");
        user.setDisplayName("Test " + prefix);
        return users.save(user);
    }

    private Role upsertRole(String code, String name) {
        return roles.findByCode(code).orElseGet(() -> {
            Role created = new Role();
            created.setCode(code);
            created.setName(name);
            created.setScope(RoleScope.PLATFORM);
            created.setSystem(true);
            return roles.save(created);
        });
    }

    private void grant(Role role, String permissionCode) {
        List<UUID> existing = jdbc.query(
                "select id from permissions where code = ?",
                (rs, rowNum) -> rs.getObject(1, UUID.class),
                permissionCode);
        UUID permissionId = existing.isEmpty() ? UUID.randomUUID() : existing.get(0);
        if (existing.isEmpty()) {
            jdbc.update(
                    "insert into permissions (id, code, name, created_at, updated_at) values (?, ?, ?, now(), now())",
                    permissionId,
                    permissionCode,
                    permissionCode);
        }

        Integer grantCount = jdbc.queryForObject(
                "select count(*) from role_permissions where role_id = ? and permission_id = ?",
                Integer.class,
                role.getId(),
                permissionId);
        if (grantCount == null || grantCount == 0) {
            RolePermission grant = new RolePermission();
            grant.setRole(role);
            grant.setPermission(entityManager.getReference(Permission.class, permissionId));
            rolePermissions.save(grant);
        }
    }

    private void membership(User user, Role role) {
        TenantMembership membership = new TenantMembership();
        membership.setTenant(host);
        membership.setUser(user);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        membership = memberships.save(membership);

        MembershipRole membershipRole = new MembershipRole();
        membershipRole.setMembership(membership);
        membershipRole.setRole(role);
        membershipRoles.save(membershipRole);
    }
}