package com.cybelinx.platform.api.externalid;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdListResponse;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdView;
import com.cybelinx.platform.api.externalid.ExternalIdViews.RegisterExternalIdRequest;
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
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
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

/** Integration tests for the tenant external-ID mapping API (Capability 25). */
@SpringBootTest
@Transactional
class TenantExternalIdServiceIT {

    @Autowired private TenantExternalIdService service;
    @Autowired private TenantRepository tenants;
    @Autowired private ProductRepository products;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User noRole;
    private Tenant tenant;
    private Product product;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");

        tenant = tenants.findByTenantCode("EXTID_HOST").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setTenantCode("EXTID_HOST");
            t.setName("ExtID Host Corp");
            t.setStatus(TenantStatus.ACTIVE);
            return tenants.save(t);
        });

        product = products.findByProductCode("JIOPLIX").orElseGet(() -> {
            Product p = new Product();
            p.setProductCode("JIOPLIX_EXTID_" + suffix);
            p.setName("Jioplix ExtID Test");
            p.setStatus(ProductStatus.ACTIVE);
            return products.save(p);
        });

        platformAdmin = user("extid-admin-");
        membership(platformAdmin, adminRole);
        noRole = user("extid-norole-");
    }

    @Test
    void registerExternalId_createsMapping() {
        ExternalIdView view = service.registerExternalId(
                principalFor(platformAdmin), tenant.getId(),
                new RegisterExternalIdRequest(product.getProductCode(), "jioplix", "ext-" + suffix));
        assertThat(view.externalIdentifierId()).isNotNull();
        assertThat(view.externalId()).isEqualTo("ext-" + suffix);
        assertThat(view.provider()).isEqualTo("jioplix");
        assertThat(view.tenantId()).isEqualTo(tenant.getId().toString());
    }

    @Test
    void registerExternalId_duplicate_throws409() {
        String extId = "dup-" + suffix;
        service.registerExternalId(principalFor(platformAdmin), tenant.getId(),
                new RegisterExternalIdRequest(product.getProductCode(), "jioplix", extId));
        assertThatThrownBy(() ->
                service.registerExternalId(principalFor(platformAdmin), tenant.getId(),
                        new RegisterExternalIdRequest(product.getProductCode(), "jioplix", extId)))
                .isInstanceOf(ApiError.class)
                .satisfies(e -> assertThat(((ApiError) e).getCode()).isEqualTo(ErrorCode.EXTERNAL_ID_ALREADY_MAPPED));
    }

    @Test
    void listExternalIds_returnsAll() {
        service.registerExternalId(principalFor(platformAdmin), tenant.getId(),
                new RegisterExternalIdRequest(product.getProductCode(), "jioplix", "list-1-" + suffix));
        service.registerExternalId(principalFor(platformAdmin), tenant.getId(),
                new RegisterExternalIdRequest(product.getProductCode(), "storeit", "list-2-" + suffix));

        ExternalIdListResponse result = service.listExternalIds(principalFor(platformAdmin), tenant.getId());
        assertThat(result.data()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(result.data()).allMatch(e -> tenant.getId().toString().equals(e.tenantId()));
    }

    @Test
    void removeExternalId_deletesMapping() {
        ExternalIdView view = service.registerExternalId(principalFor(platformAdmin), tenant.getId(),
                new RegisterExternalIdRequest(product.getProductCode(), "jioplix", "del-" + suffix));
        UUID mappingId = UUID.fromString(view.externalIdentifierId());

        service.removeExternalId(principalFor(platformAdmin), tenant.getId(), mappingId);

        ExternalIdListResponse result = service.listExternalIds(principalFor(platformAdmin), tenant.getId());
        assertThat(result.data()).noneMatch(e -> mappingId.toString().equals(e.externalIdentifierId()));
    }

    @Test
    void removeExternalId_notFound_throws404() {
        assertThatThrownBy(() ->
                service.removeExternalId(principalFor(platformAdmin), tenant.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(e -> assertThat(((ApiError) e).getCode()).isEqualTo(ErrorCode.EXTERNAL_ID_NOT_FOUND));
    }

    @Test
    void registerExternalId_missingPermission_throws() {
        assertThatThrownBy(() ->
                service.registerExternalId(principalFor(noRole), tenant.getId(),
                        new RegisterExternalIdRequest(product.getProductCode(), "jioplix", "nope-" + suffix)))
                .isInstanceOf(ApiError.class)
                .satisfies(e -> assertThat(((ApiError) e).getCode()).isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AuthPrincipal principalFor(User user) {
        return new AuthPrincipal(
                new AuthPrincipal.AuthUser(user.getId(), user.getEmail(), user.getDisplayName(), "ACTIVE", null, null),
                new AuthPrincipal.AuthIdentity("generic", "ext-" + user.getId(), user.getEmail(), user.getDisplayName()));
    }

    private User user(String prefix) {
        User u = new User();
        u.setEmail(prefix + suffix.toLowerCase() + "@cybelinx.test");
        u.setDisplayName("Test " + prefix);
        return users.save(u);
    }

    private Role upsertRole(String code, String name) {
        return roles.findByCode(code).orElseGet(() -> {
            Role r = new Role();
            r.setCode(code);
            r.setName(name);
            r.setScope(RoleScope.PLATFORM);
            r.setSystem(true);
            return roles.save(r);
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
                    permissionId, permissionCode, permissionCode);
        }
        Integer grantCount = jdbc.queryForObject(
                "select count(*) from role_permissions where role_id = ? and permission_id = ?",
                Integer.class, role.getId(), permissionId);
        if (grantCount == null || grantCount == 0) {
            RolePermission grant = new RolePermission();
            grant.setRole(role);
            grant.setPermission(entityManager.getReference(Permission.class, permissionId));
            rolePermissions.save(grant);
        }
    }

    private void membership(User user, Role role) {
        TenantMembership membership = new TenantMembership();
        membership.setTenant(tenant);
        membership.setUser(user);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        membership = memberships.save(membership);
        MembershipRole mr = new MembershipRole();
        mr.setMembership(membership);
        mr.setRole(role);
        membershipRoles.save(mr);
    }
}
