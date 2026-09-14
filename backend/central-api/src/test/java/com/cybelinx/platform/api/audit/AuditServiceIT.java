package com.cybelinx.platform.api.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.audit.AuditViews.AuditListResponse;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Permission;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
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

/** Integration tests for the audit query API (Capability 21). */
@SpringBootTest
@Transactional
class AuditServiceIT {

    @Autowired private AuditService service;
    @Autowired private AuditEventRepository auditEvents;
    @Autowired private TenantRepository tenants;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private String suffix;
    private User platformAdmin;
    private User viewer;
    private Tenant host;

    @BeforeEach
    void seedPrincipals() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role readerRole = upsertRole("AUDIT_READER_" + suffix, "Audit Reader");
        grant(readerRole, AuditConstants.PERMISSION_AUDIT_READ);

        host = tenants.findByTenantCode("AUDIT_HOST").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setTenantCode("AUDIT_HOST");
            t.setName("Audit Host Corp");
            t.setStatus(TenantStatus.ACTIVE);
            return tenants.save(t);
        });

        platformAdmin = user("audit-admin-");
        membership(platformAdmin, adminRole);
        viewer = user("audit-reader-");
        membership(viewer, readerRole);
    }

    @Test
    void listAuditEvents_returnsAll() {
        writeAuditEvent("product.created", "product", UUID.randomUUID(), null);
        writeAuditEvent("tenant.created", "tenant", UUID.randomUUID(), host.getId());

        AuditListResponse result = service.listAuditEvents(principalFor(platformAdmin), null, null, null, 1, 50, null);
        assertThat(result.data()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(result.meta().total()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void listAuditEvents_filterByEntityType() {
        writeAuditEvent("product.created", "product", UUID.randomUUID(), null);
        writeAuditEvent("tenant.created", "tenant", UUID.randomUUID(), host.getId());

        AuditListResponse result = service.listAuditEvents(
                principalFor(platformAdmin), "product", null, null, 1, 50, null);
        assertThat(result.data()).allMatch(e -> "product".equals(e.entityType()));
    }

    @Test
    void listAuditEvents_filterByTenantId() {
        writeAuditEvent("tenant.created", "tenant", UUID.randomUUID(), host.getId());

        AuditListResponse result = service.listAuditEvents(
                principalFor(platformAdmin), null, null, host.getId().toString(), 1, 50, null);
        assertThat(result.data()).isNotEmpty();
        assertThat(result.data()).allMatch(e -> host.getId().toString().equals(e.tenantId()));
    }

    @Test
    void listAuditEvents_filterByEntityId() {
        UUID targetId = UUID.randomUUID();
        writeAuditEvent("product.created", "product", targetId, null);
        writeAuditEvent("product.created", "product", UUID.randomUUID(), null);

        AuditListResponse result = service.listAuditEvents(
                principalFor(platformAdmin), "product", targetId.toString(), null, 1, 50, null);
        assertThat(result.data()).hasSize(1);
        assertThat(result.data().get(0).entityId()).isEqualTo(targetId.toString());
    }

    @Test
    void listAuditEvents_pagination() {
        for (int i = 0; i < 5; i++) {
            writeAuditEvent("product.created", "product_paged_" + suffix, UUID.randomUUID(), null);
        }
        AuditListResponse page1 = service.listAuditEvents(
                principalFor(platformAdmin), "product_paged_" + suffix, null, null, 1, 2, null);
        assertThat(page1.data()).hasSize(2);
        assertThat(page1.meta().total()).isEqualTo(5);
        assertThat(page1.meta().totalPages()).isEqualTo(3);
    }

    @Test
    void listAuditEvents_forbidden_withoutPlatformRead() {
        // viewer has platform:read, but a user with no roles should be denied
        User noRole = user("norole-");
        assertThatThrownBy(() ->
                service.listAuditEvents(principalFor(noRole), null, null, null, 1, 50, null))
                .isInstanceOf(ApiError.class)
                .satisfies(e -> assertThat(((ApiError) e).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void writeAuditEvent(String action, String entityType, UUID entityId, UUID tenantId) {
        AuditEvent event = new AuditEvent();
        event.setActorType("user");
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        if (tenantId != null) {
            event.setTenant(tenants.getReferenceById(tenantId));
        }
        auditEvents.save(event);
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
        membership.setTenant(host);
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
