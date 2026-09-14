package com.cybelinx.platform.api.usage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
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
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.usage.UsageViews.IngestUsageRequest;
import com.cybelinx.platform.api.usage.UsageViews.IngestResponse;
import com.cybelinx.platform.api.usage.UsageViews.UsageListResponse;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
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

/** Integration tests for the usage metering API (Capability 22). */
@SpringBootTest
@Transactional
class UsageServiceIT {

    @Autowired private UsageService service;
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
    private User operator;
    private User noRole;
    private Tenant tenant;
    private Product product;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role opRole = upsertRole("USAGE_OP_" + suffix, "Usage Operator");
        grant(opRole, TenantConstants.PERMISSION_TENANT_READ);
        grant(opRole, TenantConstants.PERMISSION_TENANT_WRITE);

        tenant = tenants.findByTenantCode("USAGE_HOST").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setTenantCode("USAGE_HOST");
            t.setName("Usage Test Corp");
            t.setStatus(TenantStatus.ACTIVE);
            return tenants.save(t);
        });

        product = products.findByProductCode("LIMS").orElseGet(() -> {
            Product p = new Product();
            p.setProductCode("LIMS_USAGE_" + suffix);
            p.setName("LIMS Usage Test");
            p.setStatus(ProductStatus.ACTIVE);
            return products.save(p);
        });

        platformAdmin = user("usage-admin-");
        membership(platformAdmin, adminRole);
        operator = user("usage-op-");
        membership(operator, opRole);
        noRole = user("usage-norole-");
    }

    @Test
    void ingestUsage_createsNewEvent() {
        IngestResponse resp = service.ingestUsage(principalFor(platformAdmin), tenant.getId(), request("api_call", "1"));
        assertThat(resp.status()).isEqualTo("created");
        assertThat(resp.usageEventId()).isNotNull();
    }

    @Test
    void ingestUsage_duplicateDedupeKey_returnsExisting() {
        IngestResponse first = service.ingestUsage(principalFor(platformAdmin), tenant.getId(), request("api_call", "dedupe-" + suffix));
        IngestResponse second = service.ingestUsage(principalFor(platformAdmin), tenant.getId(), request("api_call", "dedupe-" + suffix));
        assertThat(second.status()).isEqualTo("existing");
        assertThat(second.usageEventId()).isEqualTo(first.usageEventId());
    }

    @Test
    void ingestUsage_nullDedupeKey_alwaysCreates() {
        IngestResponse first = service.ingestUsage(principalFor(platformAdmin), tenant.getId(), requestNoDedupeKey("api_call"));
        IngestResponse second = service.ingestUsage(principalFor(platformAdmin), tenant.getId(), requestNoDedupeKey("api_call"));
        assertThat(first.status()).isEqualTo("created");
        assertThat(second.status()).isEqualTo("created");
        assertThat(first.usageEventId()).isNotEqualTo(second.usageEventId());
    }

    @Test
    void listUsage_returnsEventsByTenant() {
        service.ingestUsage(principalFor(platformAdmin), tenant.getId(), request("api_call", "list-1-" + suffix));
        service.ingestUsage(principalFor(platformAdmin), tenant.getId(), request("api_call", "list-2-" + suffix));

        UsageListResponse result = service.listUsage(principalFor(platformAdmin), tenant.getId(), null, null, null, 1, 50);
        assertThat(result.data()).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void listUsage_filterByEventType() {
        service.ingestUsage(principalFor(platformAdmin), tenant.getId(), requestTyped("api_call", "type-1-" + suffix));
        service.ingestUsage(principalFor(platformAdmin), tenant.getId(), requestTyped("storage_read", "type-2-" + suffix));

        UsageListResponse result = service.listUsage(principalFor(platformAdmin), tenant.getId(), "api_call", null, null, 1, 50);
        assertThat(result.data()).allMatch(e -> "api_call".equals(e.eventType()));
    }

    @Test
    void ingestUsage_missingPermission_throws() {
        assertThatThrownBy(() ->
                service.ingestUsage(principalFor(noRole), tenant.getId(), request("api_call", "nope-" + suffix)))
                .isInstanceOf(ApiError.class)
                .satisfies(e -> assertThat(((ApiError) e).getCode()).isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private IngestUsageRequest request(String eventType, String dedupeKey) {
        return new IngestUsageRequest(product.getProductCode(), eventType, BigDecimal.ONE, "count", dedupeKey, null, null);
    }

    private IngestUsageRequest requestNoDedupeKey(String eventType) {
        return new IngestUsageRequest(product.getProductCode(), eventType, BigDecimal.ONE, "count", null, null, null);
    }

    private IngestUsageRequest requestTyped(String eventType, String dedupeKey) {
        return new IngestUsageRequest(product.getProductCode(), eventType, BigDecimal.valueOf(2), "count", dedupeKey, null, null);
    }

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
