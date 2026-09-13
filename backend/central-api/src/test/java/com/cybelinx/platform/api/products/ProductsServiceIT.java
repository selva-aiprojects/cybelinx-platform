package com.cybelinx.platform.api.products;

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
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.RolePermission;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.products.dto.CreateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductStatusRequest;
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

/** Integration coverage for the product registry over a real transactional database. */
@SpringBootTest
@Transactional
class ProductsServiceIT {

    @Autowired private ProductsService service;
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
    private User operator;
    private User viewer;
    private Tenant host;

    @BeforeEach
    void seedPrincipals() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Role adminRole = upsertRole(AuthorizationService.PLATFORM_ADMIN_ROLE, "Cybelinx Platform Administrator");
        Role operatorRole = upsertRole("PRODUCT_OPERATOR", "Product Operator");
        Role viewerRole = upsertRole("PRODUCT_VIEWER", "Product Viewer");
        grant(operatorRole, ProductConstants.PERMISSION_PRODUCT_READ);
        grant(operatorRole, ProductConstants.PERMISSION_PRODUCT_WRITE);
        grant(viewerRole, ProductConstants.PERMISSION_PRODUCT_READ);

        host = tenants.findByTenantCode("ROOT01").orElseGet(() -> {
            Tenant created = new Tenant();
            created.setTenantCode("ROOT01");
            created.setName("Roots Corp");
            created.setStatus(TenantStatus.ACTIVE);
            return tenants.save(created);
        });

        platformAdmin = user("admin-");
        membership(platformAdmin, adminRole);
        operator = user("operator-");
        membership(operator, operatorRole);
        viewer = user("viewer-");
        membership(viewer, viewerRole);
    }

    @Test
    void createProduct_registersDraftAndWritesAudit() {
        var view = service.createProduct(principalFor(platformAdmin), request("ACME_" + suffix, "Acme"));

        assertThat(view.status()).isEqualTo("DRAFT");
        assertThat(view.currentVersionId()).isNull();
        assertThat(view.productCode()).isEqualTo("ACME_" + suffix);
        assertThat(auditCount("product.created", UUID.fromString(view.productId()))).isEqualTo(1);
    }

    @Test
    void createProduct_withPermissionGrant_succeeds() {
        var view = service.createProduct(principalFor(operator), request("OPS_" + suffix, "Ops"));

        assertThat(view.status()).isEqualTo("DRAFT");
    }

    @Test
    void createProduct_duplicateCode_throwsProductCodeTaken() {
        service.createProduct(principalFor(platformAdmin), request("DUPE_" + suffix, "Dupe"));

        assertThatThrownBy(() ->
                        service.createProduct(principalFor(platformAdmin), request("DUPE_" + suffix, "Dupe Again")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_CODE_TAKEN));
    }

    @Test
    void createProduct_withoutWritePermission_throwsForbidden() {
        assertThatThrownBy(() -> service.createProduct(principalFor(viewer), request("NOPE_" + suffix, "Nope")))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    void listProducts_paginatesAndFilters() {
        service.createProduct(principalFor(platformAdmin), request("LIST_A_" + suffix, "List A"));
        service.createProduct(principalFor(platformAdmin), request("LIST_B_" + suffix, "List B"));
        service.createProduct(principalFor(platformAdmin), request("LIST_C_" + suffix, "List C"));

        var all = service.listProducts(
                principalFor(platformAdmin),
                new ProductsService.ProductListQuery(1, 20, null, suffix, null));
        assertThat(all.meta().total()).isEqualTo(3);
        assertThat(all.data()).hasSize(3);

        var firstPage = service.listProducts(
                principalFor(platformAdmin),
                new ProductsService.ProductListQuery(1, 2, null, suffix, "productCode"));
        assertThat(firstPage.data()).hasSize(2);
        assertThat(firstPage.meta().total()).isEqualTo(3);
        assertThat(firstPage.meta().totalPages()).isEqualTo(2);

        var active = service.listProducts(
                principalFor(platformAdmin),
                new ProductsService.ProductListQuery(1, 20, ProductStatus.ACTIVE, suffix, null));
        assertThat(active.data()).isEmpty();
    }

    @Test
    void getProduct_returnsRegisteredProduct() {
        var created = service.createProduct(principalFor(platformAdmin), request("GET_" + suffix, "Get Me"));

        var view = service.getProduct(principalFor(platformAdmin), UUID.fromString(created.productId()));
        assertThat(view.productCode()).isEqualTo("GET_" + suffix);
        assertThat(view.name()).isEqualTo("Get Me");
    }

    @Test
    void getProduct_unknownId_throwsProductNotFound() {
        assertThatThrownBy(() -> service.getProduct(principalFor(platformAdmin), UUID.randomUUID()))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Test
    void updateProduct_changesFieldsAndWritesAudit() {
        var created = service.createProduct(principalFor(platformAdmin), request("UPD_" + suffix, "Before"));
        UUID productId = UUID.fromString(created.productId());

        UpdateProductRequest request = new UpdateProductRequest();
        request.setName("After");
        request.setDescription("Updated description");
        var view = service.updateProduct(principalFor(platformAdmin), productId, request);

        assertThat(view.name()).isEqualTo("After");
        assertThat(view.description()).isEqualTo("Updated description");
        assertThat(auditCount("product.updated", productId)).isEqualTo(1);
    }

    @Test
    void updateProductStatus_followsLifecycle() {
        var created = service.createProduct(principalFor(platformAdmin), request("LIFE_" + suffix, "Lifecycle"));
        UUID productId = UUID.fromString(created.productId());

        assertThat(service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.ACTIVE))
                        .status())
                .isEqualTo("ACTIVE");
        assertThat(service.updateProductStatus(
                                principalFor(platformAdmin), productId, status(ProductStatus.DEPRECATED))
                        .status())
                .isEqualTo("DEPRECATED");
        assertThat(service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.DISABLED))
                        .status())
                .isEqualTo("DISABLED");

        assertThat(auditCount("product.status_changed", productId)).isEqualTo(3);
    }

    @Test
    void updateProductStatus_invalidTransition_throwsTransitionInvalid() {
        var created = service.createProduct(principalFor(platformAdmin), request("BAD_" + suffix, "Bad"));
        UUID productId = UUID.fromString(created.productId());
        service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.ACTIVE));

        assertThatThrownBy(() ->
                        service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.DRAFT)))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_STATUS_TRANSITION_INVALID));
    }

    @Test
    void updateProductStatus_disabledIsTerminal() {
        var created = service.createProduct(principalFor(platformAdmin), request("TERM_" + suffix, "Terminal"));
        UUID productId = UUID.fromString(created.productId());
        service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.ACTIVE));
        service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.DISABLED));

        assertThatThrownBy(() ->
                        service.updateProductStatus(principalFor(platformAdmin), productId, status(ProductStatus.ACTIVE)))
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

    private CreateProductRequest request(String code, String name) {
        CreateProductRequest request = new CreateProductRequest();
        request.setProductCode(code);
        request.setName(name);
        return request;
    }

    private static UpdateProductStatusRequest status(ProductStatus status) {
        UpdateProductStatusRequest request = new UpdateProductStatusRequest();
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