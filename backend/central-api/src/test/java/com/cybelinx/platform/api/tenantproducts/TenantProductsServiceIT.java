package com.cybelinx.platform.api.tenantproducts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RolePermissionRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
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
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenantproducts.dto.AttachTenantProductRequest;
import com.cybelinx.platform.api.tenantproducts.dto.UpdateTenantProductStatusRequest;
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

/** Integration coverage for the tenant-product subscription registry. */
@SpringBootTest
@Transactional
class TenantProductsServiceIT {

    @Autowired private TenantProductsService service;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
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
    private Product draftProduct;
    private Plan basicPlan;
    private Plan retiredPlan;

    @BeforeEach
    void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role operatorRole = upsertRole("TENANT_OPERATOR", "Tenant Operator");
        Role viewerRole = upsertRole("TENANT_VIEWER", "Tenant Viewer");
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

        platformAdmin = user("tpadmin-");
        membership(platformAdmin, adminRole);
        operator = user("tpoperator-");
        membership(operator, operatorRole);
        viewer = user("tpviewer-");
        membership(viewer, viewerRole);

        product = new Product();
        product.setProductCode("TP_" + suffix);
        product.setName("Tenant Product");
        product.setStatus(ProductStatus.ACTIVE);
        product = products.save(product);

        draftProduct = new Product();
        draftProduct.setProductCode("TPD_" + suffix);
        draftProduct.setName("Draft Product");
        draftProduct.setStatus(ProductStatus.DRAFT);
        draftProduct = products.save(draftProduct);

        basicPlan = new Plan();
        basicPlan.setProduct(product);
        basicPlan.setPlanCode("BASIC");
        basicPlan.setName("Basic");
        basicPlan.setStatus(PlanStatus.ACTIVE);
        basicPlan = plans.save(basicPlan);

        retiredPlan = new Plan();
        retiredPlan.setProduct(product);
        retiredPlan.setPlanCode("OLD");
        retiredPlan.setName("Old");
        retiredPlan.setStatus(PlanStatus.RETIRED);
        retiredPlan = plans.save(retiredPlan);
    }

    @Test
    void attachProduct_attachesActiveProductAndWritesAudit() {
        var view = service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, "BASIC"));

        assertThat(view.productCode()).isEqualTo("TP_" + suffix);
        assertThat(view.planCode()).isEqualTo("BASIC");
        assertThat(view.status()).isEqualTo("ACTIVE");
        assertThat(view.activatedAt()).isNotNull();
        assertThat(auditCount("tenant_product.created", UUID.fromString(view.tenantProductId()))).isEqualTo(1);
    }

    @Test
    void attachProduct_picksDefaultActivePlanWhenPlanOmitted() {
        var view = service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null));

        assertThat(view.planCode()).isEqualTo("BASIC");
    }

    @Test
    void attachProduct_duplicate_throwsAlreadyAssigned() {
        service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null));

        assertThatThrownBy(() -> service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_PRODUCT_ALREADY_ASSIGNED));
    }

    @Test
    void attachProduct_unknownProduct_throwsProductNotFound() {
        assertThatThrownBy(() -> service.attachProduct(
                        principalFor(platformAdmin), host.getId(), attach("NOPE_" + suffix, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void attachProduct_inactiveProduct_throwsProductNotActive() {
        assertThatThrownBy(() -> service.attachProduct(
                        principalFor(platformAdmin), host.getId(), attach("TPD_" + suffix, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_ACTIVE));
    }

    @Test
    void attachProduct_nonActivePlan_throwsPlanNotActive() {
        assertThatThrownBy(() -> service.attachProduct(
                        principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, "OLD")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_NOT_ACTIVE));
    }

    @Test
    void attachProduct_unknownPlanCode_throwsPlanNotFound() {
        assertThatThrownBy(() -> service.attachProduct(
                        principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, "NOPE")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_NOT_FOUND));
    }

    @Test
    void attachProduct_missingTenantPermission_throwsTenantAccessDenied() {
        assertThatThrownBy(() -> service.attachProduct(principalFor(viewer), host.getId(), attach("TP_" + suffix, null)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED));
    }

    @Test
    void attachProduct_operatorWithTenantWrite_succeeds() {
        var view = service.attachProduct(principalFor(operator), host.getId(), attach("TP_" + suffix, null));
        assertThat(view.status()).isEqualTo("ACTIVE");
    }

    @Test
    void listProducts_returnsAttached() {
        service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, "BASIC"));
        var second = products.save(withCode(new Product(), "TP2_" + suffix, "Second", ProductStatus.ACTIVE));
        plans.save(planFor(second, "BASIC2"));
        service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP2_" + suffix, null));

        var result = service.listProducts(principalFor(platformAdmin), host.getId());
        assertThat(result.data()).hasSize(2);
    }

    @Test
    void updateProductStatus_transitionsAndAudits() {
        var attached = service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null));

        assertThat(service.updateProductStatus(
                                principalFor(platformAdmin), host.getId(), product.getId(), tpStatus(TenantProductStatus.SUSPENDED))
                        .status())
                .isEqualTo("SUSPENDED");
        assertThat(service.updateProductStatus(
                                principalFor(platformAdmin), host.getId(), product.getId(), tpStatus(TenantProductStatus.ACTIVE))
                        .status())
                .isEqualTo("ACTIVE");

        assertThat(auditCount("tenant_product.status_changed", UUID.fromString(attached.tenantProductId()))).isEqualTo(2);
    }

    @Test
    void updateProductStatus_invalidTransition_throws() {
        service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null));

        assertThatThrownBy(() -> service.updateProductStatus(
                        principalFor(platformAdmin), host.getId(), product.getId(), tpStatus(TenantProductStatus.PROVISIONING)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_PRODUCT_STATUS_TRANSITION_INVALID));
    }

    @Test
    void detachProduct_disablesAndAudits() {
        service.attachProduct(principalFor(platformAdmin), host.getId(), attach("TP_" + suffix, null));
        UUID tenantProductId =
                tenantProducts.findByTenantIdAndProductId(host.getId(), product.getId()).orElseThrow().getId();

        var response = service.detachProduct(principalFor(platformAdmin), host.getId(), product.getId());
        assertThat(response.status()).isEqualTo("DISABLED");
        assertThat(auditCount("tenant_product.removed", tenantProductId)).isEqualTo(1);

        assertThatThrownBy(() -> service.updateProductStatus(
                        principalFor(platformAdmin), host.getId(), product.getId(), tpStatus(TenantProductStatus.ACTIVE)))
                .isInstanceOf(ApiError.class);
    }

    @Test
    void updateProductStatus_unknownRelationship_throwsNotFound() {
        assertThatThrownBy(() -> service.updateProductStatus(
                        principalFor(platformAdmin), host.getId(), UUID.randomUUID(), tpStatus(TenantProductStatus.ACTIVE)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.TENANT_PRODUCT_NOT_FOUND));
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

    private static AttachTenantProductRequest attach(String productCode, String planCode) {
        AttachTenantProductRequest request = new AttachTenantProductRequest();
        request.setProductCode(productCode);
        request.setPlanCode(planCode);
        return request;
    }

    private static UpdateTenantProductStatusRequest tpStatus(TenantProductStatus status) {
        UpdateTenantProductStatusRequest request = new UpdateTenantProductStatusRequest();
        request.setStatus(status);
        return request;
    }

    private Product withCode(Product product, String code, String name, ProductStatus status) {
        product.setProductCode(code);
        product.setName(name);
        product.setStatus(status);
        return product;
    }

    private Plan planFor(Product product, String planCode) {
        Plan plan = new Plan();
        plan.setProduct(product);
        plan.setPlanCode(planCode);
        plan.setName(planCode);
        plan.setStatus(PlanStatus.ACTIVE);
        return plan;
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