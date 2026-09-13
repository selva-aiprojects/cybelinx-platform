package com.cybelinx.platform.api.products;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Permission;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.products.dto.CreateProductVersionRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
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

/** Integration coverage for product versioning over a real transactional database. */
@SpringBootTest
@Transactional
class ProductVersionsServiceIT {

    @Autowired private ProductVersionsService service;
    @Autowired private ProductRepository products;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private TenantRepository tenants;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User viewer;
    private Product product;
    private Tenant host;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role viewerRole = upsertRole("PRODUCT_VIEWER", "Product Viewer");
        grant(viewerRole, ProductConstants.PERMISSION_PRODUCT_READ);

        Tenant host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });
        this.host = host;

        platformAdmin = user("pvadmin-");
        membership(platformAdmin, adminRole);
        viewer = user("pvviewer-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("VER_" + suffix);
        product.setName("Versionable");
        product.setStatus(com.cybelinx.platform.api.domain.ProductStatus.ACTIVE);
        product = products.save(product);
    }

    @Test
    void createVersion_createsVersionAndWritesAudit() {
        var view = service.createVersion(principalFor(platformAdmin), product.getId(), request("1.0", "Initial"));

        assertThat(view.version()).isEqualTo("1.0");
        assertThat(view.isCurrent()).isFalse();
        assertThat(view.publishedAt()).isNull();
        assertThat(auditCount("product_version.created", UUID.fromString(view.versionId()))).isEqualTo(1);
    }

    @Test
    void createVersion_duplicateVersion_throwsVersionTaken() {
        service.createVersion(principalFor(platformAdmin), product.getId(), request("1.0", null));

        assertThatThrownBy(() -> service.createVersion(principalFor(platformAdmin), product.getId(), request("1.0", "dup")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_VERSION_TAKEN));
    }

    @Test
    void createVersion_unknownProduct_throwsProductNotFound() {
        assertThatThrownBy(() ->
                        service.createVersion(principalFor(platformAdmin), UUID.randomUUID(), request("1.0", null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void createVersion_withoutWritePermission_throwsForbidden() {
        assertThatThrownBy(() -> service.createVersion(principalFor(viewer), product.getId(), request("1.0", null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    void listVersions_returnsOldestFirst() {
        service.createVersion(principalFor(platformAdmin), product.getId(), request("1.0", null));
        service.createVersion(principalFor(platformAdmin), product.getId(), request("1.1", null));
        service.createVersion(principalFor(platformAdmin), product.getId(), request("2.0", null));

        var result = service.listVersions(principalFor(platformAdmin), product.getId());
        assertThat(result.data()).hasSize(3);
        assertThat(result.data().get(0).version()).isEqualTo("1.0");
        assertThat(result.data().get(2).version()).isEqualTo("2.0");
    }

    @Test
    void getVersion_returnsVersion() {
        var created = service.createVersion(principalFor(platformAdmin), product.getId(), request("1.2", "Notes"));

        var view = service.getVersion(principalFor(platformAdmin), product.getId(), UUID.fromString(created.versionId()));
        assertThat(view.version()).isEqualTo("1.2");
        assertThat(view.releaseNotes()).isEqualTo("Notes");
    }

    @Test
    void getVersion_unknownVersion_throwsNotFound() {
        assertThatThrownBy(() ->
                        service.getVersion(principalFor(platformAdmin), product.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_VERSION_NOT_FOUND));
    }

    @Test
    void publishVersion_swapsCurrentAndWiresProduct() {
        var v1 = service.createVersion(principalFor(platformAdmin), product.getId(), request("1.0", null));
        var v2 = service.createVersion(principalFor(platformAdmin), product.getId(), request("2.0", null));
        UUID v1Id = UUID.fromString(v1.versionId());
        UUID v2Id = UUID.fromString(v2.versionId());

        service.publishVersion(principalFor(platformAdmin), product.getId(), v1Id);
        assertThat(products.findById(product.getId()).orElseThrow().getCurrentVersion().getId()).isEqualTo(v1Id);

        service.publishVersion(principalFor(platformAdmin), product.getId(), v2Id);
        assertThat(products.findById(product.getId()).orElseThrow().getCurrentVersion().getId()).isEqualTo(v2Id);

        assertThat(service.getVersion(principalFor(platformAdmin), product.getId(), v1Id).isCurrent()).isFalse();
        assertThat(service.getVersion(principalFor(platformAdmin), product.getId(), v2Id).isCurrent()).isTrue();
        assertThat(auditCount("product_version.published", v1Id)).isEqualTo(1);
    }

    @Test
    void publishVersion_unknownVersion_throwsNotFound() {
        assertThatThrownBy(() ->
                        service.publishVersion(principalFor(platformAdmin), product.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_VERSION_NOT_FOUND));
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

    private static CreateProductVersionRequest request(String version, String releaseNotes) {
        CreateProductVersionRequest request = new CreateProductVersionRequest();
        request.setVersion(version);
        request.setReleaseNotes(releaseNotes);
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