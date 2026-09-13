package com.cybelinx.platform.api.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
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
import com.cybelinx.platform.api.plans.dto.CreatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanStatusRequest;
import com.cybelinx.platform.api.products.ProductConstants;
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

/** Integration coverage for the plan catalog over a real transactional database. */
@SpringBootTest
@Transactional
class PlansServiceIT {

    @Autowired private PlansService service;
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

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("planadmin-");
        membership(platformAdmin, adminRole);
        viewer = user("planviewer-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("PLAN_" + suffix);
        product.setName("Planable");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);
    }

    @Test
    void createPlan_createsDraftAndWritesAudit() {
        var view = service.createPlan(principalFor(platformAdmin), product.getId(), request("BASIC", "Basic"));

        assertThat(view.planCode()).isEqualTo("BASIC");
        assertThat(view.status()).isEqualTo("DRAFT");
        assertThat(view.trialDays()).isNull();
        assertThat(auditCount("plan.created", UUID.fromString(view.planId()))).isEqualTo(1);
    }

    @Test
    void createPlan_duplicatePlanCode_throwsPlanCodeTaken() {
        service.createPlan(principalFor(platformAdmin), product.getId(), request("BASIC", "Basic"));

        assertThatThrownBy(() -> service.createPlan(principalFor(platformAdmin), product.getId(), request("BASIC", "Dup")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_CODE_TAKEN));
    }

    @Test
    void createPlan_unknownProduct_throwsProductNotFound() {
        assertThatThrownBy(() ->
                        service.createPlan(principalFor(platformAdmin), UUID.randomUUID(), request("BASIC", "Basic")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void createPlan_withoutWritePermission_throwsForbidden() {
        assertThatThrownBy(() -> service.createPlan(principalFor(viewer), product.getId(), request("BASIC", "Basic")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    void listPlans_filtersByStatus() {
        service.createPlan(principalFor(platformAdmin), product.getId(), request("BASIC", "Basic"));
        var pro = service.createPlan(principalFor(platformAdmin), product.getId(), request("PROF", "Professional"));
        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), UUID.fromString(pro.planId()), status(PlanStatus.ACTIVE));

        assertThat(service.listPlans(principalFor(platformAdmin), product.getId(), null).data()).hasSize(2);
        assertThat(service.listPlans(principalFor(platformAdmin), product.getId(), PlanStatus.DRAFT).data())
                .hasSize(1);
        assertThat(service.listPlans(principalFor(platformAdmin), product.getId(), PlanStatus.ACTIVE).data())
                .extracting("planCode")
                .containsExactly("PROF");
    }

    @Test
    void getPlan_returnsPlan() {
        var created = service.createPlan(principalFor(platformAdmin), product.getId(), request("ENT", "Enterprise"));

        var view = service.getPlan(principalFor(platformAdmin), product.getId(), UUID.fromString(created.planId()));
        assertThat(view.planCode()).isEqualTo("ENT");
        assertThat(view.name()).isEqualTo("Enterprise");
    }

    @Test
    void getPlan_unknownPlan_throwsPlanNotFound() {
        assertThatThrownBy(() -> service.getPlan(principalFor(platformAdmin), product.getId(), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_NOT_FOUND));
    }

    @Test
    void updatePlan_changesFieldsAndWritesAudit() {
        var created = service.createPlan(principalFor(platformAdmin), product.getId(), request("MID", "Mid"));
        UUID planId = UUID.fromString(created.planId());

        UpdatePlanRequest update = new UpdatePlanRequest();
        update.setName("Premium");
        update.setDescription("Premium tier");
        update.setTrialDays(30);
        var view = service.updatePlan(principalFor(platformAdmin), product.getId(), planId, update);

        assertThat(view.name()).isEqualTo("Premium");
        assertThat(view.trialDays()).isEqualTo(30);
        assertThat(auditCount("plan.updated", planId)).isEqualTo(1);
    }

    @Test
    void updatePlanStatus_followsLifecycle() {
        var created = service.createPlan(principalFor(platformAdmin), product.getId(), request("LIFE", "Lifecycle"));
        UUID planId = UUID.fromString(created.planId());

        assertThat(service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.ACTIVE))
                        .status())
                .isEqualTo("ACTIVE");
        assertThat(service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.RETIRED))
                        .status())
                .isEqualTo("RETIRED");

        assertThat(auditCount("plan.status_changed", planId)).isEqualTo(2);
    }

    @Test
    void updatePlanStatus_invalidTransition_throwsTransitionInvalid() {
        var created = service.createPlan(principalFor(platformAdmin), product.getId(), request("BAD", "Bad"));
        UUID planId = UUID.fromString(created.planId());
        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.ACTIVE));

        assertThatThrownBy(() ->
                        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.DRAFT)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_STATUS_TRANSITION_INVALID));
    }

    @Test
    void updatePlanStatus_retiredIsTerminal() {
        var created = service.createPlan(principalFor(platformAdmin), product.getId(), request("TERM", "Terminal"));
        UUID planId = UUID.fromString(created.planId());
        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.ACTIVE));
        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.RETIRED));

        assertThatThrownBy(() ->
                        service.updatePlanStatus(principalFor(platformAdmin), product.getId(), planId, status(PlanStatus.ACTIVE)))
                .isInstanceOf(ApiError.class);
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

    private static CreatePlanRequest request(String code, String name) {
        CreatePlanRequest request = new CreatePlanRequest();
        request.setPlanCode(code);
        request.setName(name);
        return request;
    }

    private static UpdatePlanStatusRequest status(PlanStatus status) {
        UpdatePlanStatusRequest request = new UpdatePlanStatusRequest();
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