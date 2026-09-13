package com.cybelinx.platform.api.storageisolation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.DatabaseStatus;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.RuntimeRole;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.DatabaseRepository;
import com.cybelinx.platform.api.persistence.DatabaseSchemaRepository;
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
import com.cybelinx.platform.api.persistence.entity.DatabaseSchema;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Region;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthUser;
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

/**
 * Integration coverage for the Cap-10 storage-isolation enforcer (TRD A-13 /
 * A-13.1). Authorized, trusted resolution is delegated to the Cap-9 resolver —
 * products never construct database/schema/host information themselves. This
 * test pins the two things the enforcer owns: (1) least-privilege
 * {@link RuntimeRole} per isolation model and (2) the pooled {@code search_path}
 * contract — the {@code SET} is connection/transaction-scoped and always paired
 * with a {@code RESET} that MUST run before the pooled connection is returned,
 * so Tenant A's schema is never retained when the pool later serves Tenant B
 * (TRD A-13.1).
 */
@SpringBootTest
@Transactional
class TenantStorageIsolationIT {

    @Autowired private StorageIsolationEnforcer enforcer;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private RegionRepository regions;
    @Autowired private ResourceCatalogRepository catalog;
    @Autowired private DatabaseRepository databases;
    @Autowired private DatabaseSchemaRepository schemas;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User viewer;
    private Tenant host;
    private Product product;
    private TenantProduct subscription;
    private Resource catalogEntryMetadata;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("sia-");
        viewer = user("siv-");

        product = new Product();
        product.setProductCode("SI_" + suffix);
        product.setName("Storage Isolation Product");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);

        Plan plan = new Plan();
        plan.setProduct(product);
        plan.setPlanCode("BASIC");
        plan.setName("Basic");
        plan.setStatus(PlanStatus.ACTIVE);
        plans.save(plan);

        subscription = new TenantProduct();
        subscription.setTenant(host);
        subscription.setProduct(product);
        subscription.setPlan(plan);
        subscription.setStatus(TenantProductStatus.ACTIVE);
        subscription.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        subscription = tenantProducts.save(subscription);

        catalogEntryMetadata = catalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            Resource created = new Resource();
            created.setResourceTypeCode("shared_pg_instance");
            created.setName("Shared PostgreSQL Instance");
            return catalog.save(created);
        });
    }

    @Test
    void enforce_schemaPerTenant_returnsLeastPrivilegeSchemaOwnerWithScopedSearchPath() {
        seedResource(TenantResourceStatus.ACTIVE, true);

        RuntimeConnectionContext context = enforcer.enforce(
                principalFor(platformAdmin),
                host.getId(),
                product.getId(),
                Environment.DEVELOPMENT);

        assertThat(context.isolationMode()).isEqualTo("SCHEMA_PER_TENANT");
        assertThat(context.runtimeRole()).isEqualTo(RuntimeRole.TENANT_SCHEMA_OWNER);
        assertThat(context.schemaName()).isEqualTo("cyb_schema_" + suffix.toLowerCase());
        assertThat(context.searchPathSetCommand())
                .isEqualTo("SET search_path = \"cyb_schema_" + suffix.toLowerCase() + "\", public");
        assertThat(context.searchPathResetCommand()).isEqualTo("RESET search_path");
        assertThat(context.databaseName()).isEqualTo("cyb_db_" + suffix.toLowerCase());
        assertThat(context.databaseEndpoint()).isEqualTo("localhost");
        assertThat(context.databasePort()).isEqualTo(5432);
        assertThat(context.regionCode()).isEqualTo("AP-SOUTH-1");
        assertThat(context.credentialReference()).isEqualTo("vault/cyb/" + suffix.toLowerCase());
    }

    @Test
    void enforce_sharedPool_returnsLeastPrivilegeRuntimeWithoutSchemaScoping() {
        seedResource(TenantResourceStatus.ACTIVE, false);

        RuntimeConnectionContext context = enforcer.enforce(
                principalFor(platformAdmin),
                host.getId(),
                product.getId(),
                Environment.DEVELOPMENT);

        assertThat(context.isolationMode()).isEqualTo("SHARED_POOL");
        assertThat(context.runtimeRole()).isEqualTo(RuntimeRole.PRODUCT_RUNTIME);
        assertThat(context.schemaName()).isNull();
        assertThat(context.searchPathSetCommand()).isNull();
        assertThat(context.searchPathResetCommand()).isNull();
    }

    @Test
    void enforce_missingResource_throwsResourceNotFound() {
        assertThatThrownBy(() -> enforcer.enforce(
                principalFor(platformAdmin),
                host.getId(),
                product.getId(),
                Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void enforce_missingPermission_throwsTenantAccessDenied() {
        seedResource(TenantResourceStatus.ACTIVE, false);

        assertThatThrownBy(() -> enforcer.enforce(
                principalFor(viewer),
                host.getId(),
                product.getId(),
                Environment.DEVELOPMENT))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    // ---------------------------------------------------------------------
    // Helpers (mirror Cap-9 resolver IT)
    // ---------------------------------------------------------------------

    private void seedResource(TenantResourceStatus status, boolean withDatabase) {
        seedResource(catalogEntryMetadata, status, withDatabase);
    }

    private void seedResource(
            Resource catalogResource, TenantResourceStatus status, boolean withDatabase) {
        TenantResource resource = new TenantResource();
        resource.setTenant(host);
        resource.setProduct(product);
        resource.setTenantProduct(subscription);
        resource.setResource(catalogResource);
        resource.setIsolationMode(
                withDatabase ? IsolationMode.SCHEMA_PER_TENANT : IsolationMode.SHARED_POOL);
        resource.setEnvironment(Environment.DEVELOPMENT);
        resource.setStatus(status);
        resource.setProvisioningState(
                status == TenantResourceStatus.ACTIVE
                        ? ProvisioningState.SUCCEEDED
                        : ProvisioningState.IN_PROGRESS);
        resource.setCredentialReference("vault/cyb/" + suffix.toLowerCase());
        if (withDatabase) {
            attachDatabase(resource);
        }
        tenantResources.save(resource);
    }

    private void attachDatabase(TenantResource resource) {
        Region territory = new Region();
        territory.setRegionCode("AP-SOUTH-1");
        territory.setName("AP South 1");
        territory = regions.save(territory);

        Database database = new Database();
        database.setName("cyb_db_" + suffix.toLowerCase());
        database.setProvider("postgres");
        database.setEndpoint("localhost");
        database.setRegion(territory);
        database.setPort(5432);
        database.setStatus(DatabaseStatus.ACTIVE);
        database = databases.save(database);

        DatabaseSchema schema = new DatabaseSchema();
        schema.setDatabase(database);
        schema.setSchemaName("cyb_schema_" + suffix.toLowerCase());
        schemas.save(schema);

        resource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
        resource.setDatabase(database);
        resource.setSchemaName("cyb_schema_" + suffix.toLowerCase());
        resource.setRegion(territory);
    }

    private AuthPrincipal principalFor(User user) {
        return new AuthPrincipal(
                new AuthUser(
                        user.getId(), user.getEmail(), user.getDisplayName(), "ACTIVE", null, null),
                new AuthIdentity(
                        "generic", "ext-" + user.getId(), user.getEmail(), user.getDisplayName()));
    }

    private User user(String prefix) {
        User user = new User();
        user.setEmail(prefix + suffix.toLowerCase() + "@cybelinx.test");
        user.setDisplayName("Test " + prefix);
        return users.save(user);
    }
}
