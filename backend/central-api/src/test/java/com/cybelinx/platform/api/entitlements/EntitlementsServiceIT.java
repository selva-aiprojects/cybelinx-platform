package com.cybelinx.platform.api.entitlements;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.EntitlementStatus;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.entitlements.dto.CreateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementStatusRequest;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Permission;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
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

/** Integration coverage for plan entitlements over a real transactional database. */
@SpringBootTest
@Transactional
class EntitlementsServiceIT {

    @Autowired private EntitlementsService service;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
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
    private Plan plan;
    private Tenant host;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role viewerRole = upsertRole("PRODUCT_VIEWER", "Product Viewer");
        grant(viewerRole, ProductConstants.PERMISSION_PRODUCT_READ);

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("entadmin-");
        membership(platformAdmin, adminRole);
        viewer = user("entviewer-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("ENT_" + suffix);
        product.setName("Entitleable");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);

        plan = new Plan();
        plan.setProduct(product);
        plan.setPlanCode("BASIC");
        plan.setName("Basic");
        plan.setStatus(PlanStatus.ACTIVE);
        plan = plans.save(plan);
    }

    @Test
    void createEntitlement_createsActiveAndWritesAudit() {
        var view = service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("api.enabled", "API Enabled", Map.of("enabled", true)));

        assertThat(view.key()).isEqualTo("api.enabled");
        assertThat(view.status()).isEqualTo("ACTIVE");
        assertThat(view.value()).containsEntry("enabled", true);
        assertThat(auditCount("entitlement.created", UUID.fromString(view.entitlementId()))).isEqualTo(1);
    }

    @Test
    void createEntitlement_duplicateKey_throwsKeyTaken() {
        service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("users", null, Map.of("max", 50)));

        assertThatThrownBy(() -> service.createEntitlement(
                        principalFor(platformAdmin), product.getId(), plan.getId(), request("users", null, Map.of("max", 50))))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.ENTITLEMENT_KEY_TAKEN));
    }

    @Test
    void createEntitlement_unknownPlan_throwsPlanNotFound() {
        assertThatThrownBy(() -> service.createEntitlement(
                        principalFor(platformAdmin), product.getId(), UUID.randomUUID(), request("k", null, Map.of("a", 1))))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_NOT_FOUND));
    }

    @Test
    void createEntitlement_withoutWritePermission_throwsForbidden() {
        assertThatThrownBy(() -> service.createEntitlement(
                        principalFor(viewer), product.getId(), plan.getId(), request("k", null, Map.of("a", 1))))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    void listEntitlements_returnsAll() {
        service.createEntitlement(principalFor(platformAdmin), product.getId(), plan.getId(), request("a", null, Map.of("x", 1)));
        service.createEntitlement(principalFor(platformAdmin), product.getId(), plan.getId(), request("b", null, Map.of("y", 2)));

        var result = service.listEntitlements(principalFor(platformAdmin), product.getId(), plan.getId());
        assertThat(result.data()).hasSize(2);
    }

    @Test
    void getEntitlement_returnsValue() {
        var created = service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("storage_gb", "Storage limit", Map.of("gb", 100)));

        var view = service.getEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), UUID.fromString(created.entitlementId()));
        assertThat(view.name()).isEqualTo("Storage limit");
        assertThat(view.value()).containsEntry("gb", 100);
    }

    @Test
    void getEntitlement_unknown_throwsNotFound() {
        assertThatThrownBy(() -> service.getEntitlement(
                        principalFor(platformAdmin), product.getId(), plan.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.ENTITLEMENT_NOT_FOUND));
    }

    @Test
    void updateEntitlement_changesNameAndValue_writesAudit() {
        var created = service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("api.enabled", "API", Map.of("enabled", true)));
        UUID id = UUID.fromString(created.entitlementId());

        UpdateEntitlementRequest update = new UpdateEntitlementRequest();
        update.setName("API Access");
        update.setValue(Map.of("enabled", false));
        var view = service.updateEntitlement(principalFor(platformAdmin), product.getId(), plan.getId(), id, update);

        assertThat(view.name()).isEqualTo("API Access");
        assertThat(view.value()).containsEntry("enabled", false);
        assertThat(auditCount("entitlement.updated", id)).isEqualTo(1);
    }

    @Test
    void updateEntitlementStatus_followsStateMachine() {
        var created = service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("k", null, Map.of("a", 1)));
        UUID id = UUID.fromString(created.entitlementId());

        assertThat(service.updateEntitlementStatus(
                                principalFor(platformAdmin), product.getId(), plan.getId(), id, status(EntitlementStatus.SUSPENDED))
                        .status())
                .isEqualTo("SUSPENDED");
        assertThat(service.updateEntitlementStatus(
                                principalFor(platformAdmin), product.getId(), plan.getId(), id, status(EntitlementStatus.ACTIVE))
                        .status())
                .isEqualTo("ACTIVE");
        assertThat(service.updateEntitlementStatus(
                                principalFor(platformAdmin), product.getId(), plan.getId(), id, status(EntitlementStatus.INACTIVE))
                        .status())
                .isEqualTo("INACTIVE");
        assertThat(service.updateEntitlementStatus(
                                principalFor(platformAdmin), product.getId(), plan.getId(), id, status(EntitlementStatus.ACTIVE))
                        .status())
                .isEqualTo("ACTIVE");

        assertThat(auditCount("entitlement.status_changed", id)).isEqualTo(4);
    }

    @Test
    void updateEntitlementStatus_invalidTransition_throws() {
        var created = service.createEntitlement(
                principalFor(platformAdmin), product.getId(), plan.getId(), request("k2", null, Map.of("a", 1)));
        UUID id = UUID.fromString(created.entitlementId());

        assertThatThrownBy(() -> service.updateEntitlementStatus(
                        principalFor(platformAdmin), product.getId(), plan.getId(), id, status(EntitlementStatus.PENDING)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.ENTITLEMENT_STATUS_TRANSITION_INVALID));
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

    private static CreateEntitlementRequest request(String key, String name, Map<String, Object> value) {
        CreateEntitlementRequest request = new CreateEntitlementRequest();
        request.setKey(key);
        request.setName(name);
        request.setValue(value);
        return request;
    }

    private static UpdateEntitlementStatusRequest status(EntitlementStatus status) {
        UpdateEntitlementStatusRequest request = new UpdateEntitlementStatusRequest();
        request.setStatus(status);
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