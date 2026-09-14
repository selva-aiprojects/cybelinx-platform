package com.cybelinx.platform.api.resourceresolver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.DatabaseStatus;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RegionRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.Database;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Permission;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Region;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenantresources.TenantResourcesService;
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
import org.springframework.transaction.annotation.Transactional;

/** Integration coverage for the trust-based tenant resource resolver. */
@SpringBootTest
@Transactional
class TenantResourceResolverIT {

    @Autowired private TenantResourcesService service;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private RegionRepository regions;
    @Autowired private ResourceCatalogRepository catalog;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User viewer;
    private Tenant host;
    private Product product;
    private TenantProduct subscription;
    private com.cybelinx.platform.api.persistence.entity.Resource catalogEntry;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role viewerRole = upsertRole("RR_VIEWER", "Resolver Viewer");
        grant(viewerRole, TenantConstants.PERMISSION_TENANT_READ);

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("rr-");
        membership(platformAdmin, adminRole);
        viewer = user("rrv-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("RR_" + suffix);
        product.setName("Resolver Product");
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
        subscription.setStatus(TenantProductStatus.ACTIVE);
        subscription.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        subscription = tenantProducts.save(subscription);

        catalogEntry = catalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            com.cybelinx.platform.api.persistence.entity.Resource created =
                    new com.cybelinx.platform.api.persistence.entity.Resource();
            created.setResourceTypeCode("shared_pg_instance");
            created.setName("Shared PostgreSQL Instance");
            return catalog.save(created);
        });
    }

    @Test
    void resolve_returnsActiveResourceMetadata() {
        seedResource(TenantResourceStatus.ACTIVE, Environment.DEVELOPMENT, true);

        var resolved = service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT);

        assertThat(resolved.tenantId()).isEqualTo(host.getId());
        assertThat(resolved.productId()).isEqualTo(product.getId());
        assertThat(resolved.resourceTypeCode()).isEqualTo("shared_pg_instance");
        assertThat(resolved.isolationMode()).isEqualTo("SCHEMA_PER_TENANT");
        assertThat(resolved.databaseName()).isEqualTo("cyb_db_" + suffix.toLowerCase());
        assertThat(resolved.schemaName()).isEqualTo("cyb_schema_" + suffix.toLowerCase());
        assertThat(resolved.regionCode()).isEqualTo("AP-SOUTH-1");
        assertThat(resolved.credentialReference()).isEqualTo("vault/cyb/" + suffix.toLowerCase());
    }

    @Test
    void resolve_environmentDefaultsToDevelopment() {
        seedResource(TenantResourceStatus.ACTIVE, Environment.DEVELOPMENT, false);

        var resolved = service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT);
        assertThat(resolved.isolationMode()).isEqualTo("SHARED_POOL");
        assertThat(resolved.databaseName()).isNull();
        assertThat(resolved.schemaName()).isNull();
    }

    @Test
    void resolve_noResource_throwsResourceNotFound() {
        assertThatThrownBy(() -> service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void resolve_provisioningResource_throwsNotReady() {
        seedResource(TenantResourceStatus.PROVISIONING, Environment.DEVELOPMENT, false);

        assertThatThrownBy(() -> service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_READY));
    }

    @Test
    void resolve_retiredOnly_throwsNotFound() {
        seedResource(TenantResourceStatus.RETIRED, Environment.DEVELOPMENT, false);

        assertThatThrownBy(() -> service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void resolve_environmentMismatch_throwsNotFound() {
        seedResource(TenantResourceStatus.ACTIVE, Environment.DEVELOPMENT, false);

        assertThatThrownBy(() -> service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.PRODUCTION))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void resolve_unknownProduct_throwsProductNotFound() {
        seedResource(TenantResourceStatus.ACTIVE, Environment.DEVELOPMENT, false);

        assertThatThrownBy(() -> service.resolveResource(principalFor(platformAdmin), host.getId(), UUID.randomUUID(), Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void resolve_missingPermission_throwsTenantAccessDenied() {
        seedResource(TenantResourceStatus.ACTIVE, Environment.DEVELOPMENT, false);
        User outsider = user("rr-out-");

        assertThatThrownBy(() -> service.resolveResource(principalFor(outsider), host.getId(), product.getId(), Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    @Test
    void resolve_picksActiveOverProvisioning() {
        seedCatalog("dedicated_pg_instance", "Dedicated PostgreSQL Instance");
        seedResource(catalogEntry, TenantResourceStatus.PROVISIONING);
        com.cybelinx.platform.api.persistence.entity.Resource activeCatalog =
                catalog.findByResourceTypeCode("dedicated_pg_instance").orElseThrow();
        seedResource(activeCatalog, TenantResourceStatus.ACTIVE);

        var resolved = service.resolveResource(principalFor(platformAdmin), host.getId(), product.getId(), Environment.DEVELOPMENT);
        assertThat(resolved.resourceTypeCode()).isEqualTo("dedicated_pg_instance");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void seedCatalog(String code, String name) {
        catalog.findByResourceTypeCode(code).orElseGet(() -> {
            com.cybelinx.platform.api.persistence.entity.Resource created =
                    new com.cybelinx.platform.api.persistence.entity.Resource();
            created.setResourceTypeCode(code);
            created.setName(name);
            return catalog.save(created);
        });
    }

    private void seedResource(TenantResourceStatus status, Environment environment, boolean withDatabase) {
        seedResource(catalogEntry, status, withDatabase);
    }

    private void seedResource(
            com.cybelinx.platform.api.persistence.entity.Resource catalogResource, TenantResourceStatus status) {
        seedResource(catalogResource, status, false);
    }

    private void seedResource(
            com.cybelinx.platform.api.persistence.entity.Resource catalogResource,
            TenantResourceStatus status,
            boolean withDatabase) {
        TenantResource resource = new TenantResource();
        resource.setTenant(host);
        resource.setProduct(product);
        resource.setTenantProduct(subscription);
        resource.setResource(catalogResource);
        resource.setIsolationMode(withDatabase ? IsolationMode.SCHEMA_PER_TENANT : IsolationMode.SHARED_POOL);
        resource.setEnvironment(Environment.DEVELOPMENT);
        resource.setStatus(status);
        resource.setProvisioningState(
                status == TenantResourceStatus.ACTIVE ? ProvisioningState.SUCCEEDED : ProvisioningState.IN_PROGRESS);
        resource.setCredentialReference("vault/cyb/" + suffix.toLowerCase());
        if (withDatabase) {
            attachDatabase(resource);
        }
        tenantResources.save(resource);
    }

    private void attachDatabase(TenantResource resource) {
        Region region = new Region();
        region.setRegionCode("AP-SOUTH-1");
        region.setName("AP South 1");
        region = regions.save(region);

        Database database = new Database();
        database.setName("cyb_db_" + suffix.toLowerCase());
        database.setProvider("postgres");
        database.setEndpoint("localhost:5432");
        database.setRegion(region);
        database.setPort(5432);
        database.setStatus(DatabaseStatus.ACTIVE);
        entityManager.persist(database);

        resource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
        resource.setDatabase(database);
        resource.setSchemaName("cyb_schema_" + suffix.toLowerCase());
        resource.setRegion(region);
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
        List<UUID> existing = entityManager
                .createQuery("select p.id from Permission p where p.code = :code", UUID.class)
                .setParameter("code", permissionCode)
                .getResultList();
        UUID permissionId = existing.isEmpty() ? UUID.randomUUID() : existing.get(0);
        if (existing.isEmpty()) {
            Permission permission = new Permission();
            permission.setId(permissionId);
            permission.setCode(permissionCode);
            permission.setName(permissionCode);
            entityManager.persist(permission);
            entityManager.flush();
        }

        Integer grantCount = entityManager
                .createQuery(
                        "select count(rp) from RolePermission rp where rp.role = :role and rp.permission.id = :permissionId",
                        Long.class)
                .setParameter("role", role)
                .setParameter("permissionId", permissionId)
                .getSingleResult()
                .intValue();
        if (grantCount == 0) {
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