package com.cybelinx.platform.api.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.iam.IamService;
import com.cybelinx.platform.api.iam.IamViews;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapterRegistry;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardStatusView;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.service.GenericProductOnboardingService;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantExternalIdentifierRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 1C End-to-End Acceptance Test Suite:
 * Validates the 5 Core Multi-Tenant Onboarding & Security Isolation Acceptance Tests
 * for Customer 1 (ACME / Jioplix) and Customer 2 (Nike / StoreAI).
 */
@SpringBootTest
@Transactional
class TenantUserAndOnboardingE2EIT {

    @Autowired private GenericProductOnboardingService onboardingService;
    @Autowired private ProductAdapterRegistry registry;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private IamService iamService;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantExternalIdentifierRepository externalIds;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private UserRepository users;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private RoleRepository roles;
    @Autowired private AuthorizationService authorization;
    @Autowired private JdbcTemplate jdbcTemplate;

    private AuthPrincipal platformAdminPrincipal;

    @BeforeEach
    void setUp() {
        User adminUser = users.findByEmail("dev.admin@cybelinx.test")
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail("dev.admin@cybelinx.test");
                    u.setDisplayName("Cybelinx Dev Admin");
                    u.setStatus(com.cybelinx.platform.api.domain.UserStatus.ACTIVE);
                    return users.save(u);
                });

        Tenant sysTenant = tenants.findByTenantCode("SYS_ADMIN_TENANT").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setTenantCode("SYS_ADMIN_TENANT");
            t.setName("System Admin Tenant");
            t.setStatus(TenantStatus.ACTIVE);
            return tenants.save(t);
        });

        TenantMembership sysMembership = memberships.findByTenant_IdAndUser_Id(sysTenant.getId(), adminUser.getId()).orElseGet(() -> {
            TenantMembership m = new TenantMembership();
            m.setTenant(sysTenant);
            m.setUser(adminUser);
            m.setStatus(MembershipStatus.ACTIVE);
            return memberships.save(m);
        });

        Role adminRole = roles.findByCode(TenantConstants.PLATFORM_ADMIN_ROLE).orElseGet(() -> {
            Role r = new Role();
            r.setCode(TenantConstants.PLATFORM_ADMIN_ROLE);
            r.setName("Platform Admin");
            r.setScope(com.cybelinx.platform.api.domain.RoleScope.PLATFORM);
            return roles.save(r);
        });

        boolean hasRole = membershipRoles.findByMembership_Id(sysMembership.getId()).stream()
                .anyMatch(mr -> mr.getRole().getCode().equals(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (!hasRole) {
            MembershipRole mr = new MembershipRole();
            mr.setMembership(sysMembership);
            mr.setRole(adminRole);
            membershipRoles.save(mr);
        }

        platformAdminPrincipal = new AuthPrincipal(
                new AuthPrincipal.AuthUser(adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName(), "ACTIVE", "en", "UTC"),
                new AuthPrincipal.AuthIdentity("generic", "seed-dev-admin-0001", adminUser.getEmail(), adminUser.getDisplayName())
        );

        for (ProductOnboardingDefinition def : registry.getAvailableDefinitions()) {
            Product prod = products.findByProductCode(def.productCode()).orElseGet(() -> {
                Product p = new Product();
                p.setProductCode(def.productCode());
                p.setName(def.displayName());
                p.setDescription(def.description());
                p.setStatus(ProductStatus.ACTIVE);
                p.setDefaultIsolationMode("SCHEMA_PER_TENANT");
                p.setSchemaPrefix(def.productCode().toLowerCase() + "_");
                return products.save(p);
            });
            for (String planCode : def.subscription().availablePlans()) {
                plans.findByProductIdAndPlanCode(prod.getId(), planCode).orElseGet(() -> {
                    Plan p = new Plan();
                    p.setProduct(prod);
                    p.setPlanCode(planCode);
                    p.setName(planCode);
                    p.setStatus(PlanStatus.ACTIVE);
                    return plans.save(p);
                });
            }
        }
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.execute("DELETE FROM public.product_repository_customers");
        jdbcTemplate.execute("DELETE FROM public.usage_events");
        jdbcTemplate.execute("DELETE FROM public.provisioning_steps");
        jdbcTemplate.execute("DELETE FROM public.provisioning_jobs");
        jdbcTemplate.execute("DELETE FROM public.tenant_resources");
        jdbcTemplate.execute("DELETE FROM public.tenant_products");
        jdbcTemplate.execute("DELETE FROM public.tenant_external_identifiers");
        jdbcTemplate.execute("DELETE FROM public.entitlements");
        jdbcTemplate.execute("DELETE FROM public.plans");
        jdbcTemplate.execute("DELETE FROM public.product_versions");
        jdbcTemplate.execute("DELETE FROM public.products");
    }

    @Test
    @DisplayName("TEST 1: Customer 1 (ACME / Jioplix) - Onboarding, Subscription, Provisioning & Admin Identity")
    void test1_AcmeHospitalOnboarding() {
        GenericOnboardRequest request = new GenericOnboardRequest(
                "JIOPLIX",
                "HOSP_ACME_E2E_01",
                "ACME_HOSPITAL_E2E",
                "ACME Multispecialty Hospital E2E",
                "JIOPLIX_ENTERPRISE",
                "https://acme.jioplix.com",
                "admin@acme-hospital.org",
                "Dr. Acme Admin",
                "usr_acme_admin_01",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                "acme_hospital_jioplix_db",
                "ap-south-1",
                Map.of("hospitalName", "ACME Multispecialty Hospital E2E", "country", "India")
        );

        GenericOnboardResponse res = onboardingService.onboardTenant(platformAdminPrincipal, request);

        assertThat(res.status()).isIn("SUCCESS", "ALREADY_ONBOARDED");
        assertThat(res.tenantCode()).isEqualTo("ACME_HOSPITAL_E2E");
        assertThat(res.productCode()).isEqualTo("JIOPLIX");
        assertThat(res.executedSteps()).contains("VALIDATE_TENANT", "MAP_EXTERNAL_ID", "ATTACH_SUBSCRIPTION", "PROVISION_SCHEMA");

        // Verify Tenant & Admin User Identity Created
        Optional<Tenant> tenantOpt = tenants.findByTenantCode("ACME_HOSPITAL_E2E");
        assertThat(tenantOpt).isPresent();
        Tenant tenant = tenantOpt.get();

        Optional<User> userOpt = users.findByEmail("admin@acme-hospital.org");
        assertThat(userOpt).isPresent();

        Optional<TenantMembership> tmOpt = memberships.findByTenant_IdAndUser_Id(tenant.getId(), userOpt.get().getId());
        assertThat(tmOpt).isPresent();

        List<MembershipRole> roles = membershipRoles.findByMembership_Id(tmOpt.get().getId());
        assertThat(roles).isNotEmpty();
        assertThat(roles.stream().anyMatch(r -> r.getRole().getCode().equals("TENANT_ADMIN"))).isTrue();
    }

    @Test
    @DisplayName("TEST 2: Customer 2 (Nike / StoreAI) - Onboarding, Subscription, Provisioning & Admin Identity")
    void test2_NikeStoreOnboarding() {
        GenericOnboardRequest request = new GenericOnboardRequest(
                "STOREAI",
                "STORE_NIKE_E2E_01",
                "STOREAI_NIKE_E2E",
                "Nike Flagship Store E2E",
                "STOREAI_ENTERPRISE",
                "https://nike.storeai.com",
                "merchant@nike-e2e.com",
                "Nike Merchant Owner",
                "usr_nike_owner_e2e",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                "tenant_prod_storeai_nike_e2e_db",
                "eu-west-1",
                Map.of("storeName", "Nike Flagship Store E2E")
        );

        GenericOnboardResponse res = onboardingService.onboardTenant(platformAdminPrincipal, request);

        assertThat(res.status()).isIn("SUCCESS", "ALREADY_ONBOARDED");
        assertThat(res.tenantCode()).isEqualTo("STOREAI_NIKE_E2E");
        assertThat(res.productCode()).isEqualTo("STOREAI");

        Optional<Tenant> tenantOpt = tenants.findByTenantCode("STOREAI_NIKE_E2E");
        assertThat(tenantOpt).isPresent();

        Optional<User> userOpt = users.findByEmail("merchant@nike-e2e.com");
        assertThat(userOpt).isPresent();
    }

    @Test
    @DisplayName("TEST 3: Security Scoping Barrier - ACME Hospital User Accessing Nike StoreAI -> DENIED (403)")
    void test3_AcmeUserAccessingNikeStoreAiDenied() {
        // Create ACME Hospital
        GenericOnboardResponse acmeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "JIOPLIX", "ACME_EXT_TEST3", "ACME_T3", "ACME T3 Hospital", "JIOPLIX_ENTERPRISE",
                "https://acme-t3.com", "user.acme.t3@test.com", "ACME Admin T3", "usr_acme_t3",
                "SCHEMA_PER_TENANT", "PRODUCTION", "acme_t3_schema", "ap-south-1", Map.of()
        ));

        // Create Nike Store
        GenericOnboardResponse nikeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "STOREAI", "NIKE_EXT_TEST3", "NIKE_T3", "Nike T3 Store", "STOREAI_ENTERPRISE",
                "https://nike-t3.com", "user.nike.t3@test.com", "Nike Admin T3", "usr_nike_t3",
                "SCHEMA_PER_TENANT", "PRODUCTION", "nike_t3_schema", "eu-west-1", Map.of()
        ));

        UUID acmeUserId = users.findByEmail("user.acme.t3@test.com").get().getId();
        UUID nikeTenantId = UUID.fromString(nikeRes.tenantId());

        AuthPrincipal acmeUserPrincipal = new AuthPrincipal(
                new AuthPrincipal.AuthUser(acmeUserId, "user.acme.t3@test.com", "ACME Admin T3", "ACTIVE", "en", "UTC"),
                new AuthPrincipal.AuthIdentity("generic", "sub-acme-t3", "user.acme.t3@test.com", "ACME Admin T3")
        );

        // Attempting to access or manage Nike's tenant environment as ACME user MUST throw Access Denied ApiError
        assertThatThrownBy(() -> iamService.listTenantMembers(acmeUserPrincipal, nikeTenantId))
                .isInstanceOf(ApiError.class)
                .hasMessageContaining("access");
    }

    @Test
    @DisplayName("TEST 4: Security Scoping Barrier - Nike Merchant User Accessing ACME Hospital Jioplix -> DENIED (403)")
    void test4_NikeUserAccessingAcmeHospitalDenied() {
        GenericOnboardResponse acmeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "JIOPLIX", "ACME_EXT_TEST4", "ACME_T4", "ACME T4 Hospital", "JIOPLIX_ENTERPRISE",
                "https://acme-t4.com", "user.acme.t4@test.com", "ACME Admin T4", "usr_acme_t4",
                "SCHEMA_PER_TENANT", "PRODUCTION", "acme_t4_schema", "ap-south-1", Map.of()
        ));

        GenericOnboardResponse nikeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "STOREAI", "NIKE_EXT_TEST4", "NIKE_T4", "Nike T4 Store", "STOREAI_ENTERPRISE",
                "https://nike-t4.com", "user.nike.t4@test.com", "Nike Admin T4", "usr_nike_t4",
                "SCHEMA_PER_TENANT", "PRODUCTION", "nike_t4_schema", "eu-west-1", Map.of()
        ));

        UUID nikeUserId = users.findByEmail("user.nike.t4@test.com").get().getId();
        UUID acmeTenantId = UUID.fromString(acmeRes.tenantId());

        AuthPrincipal nikeUserPrincipal = new AuthPrincipal(
                new AuthPrincipal.AuthUser(nikeUserId, "user.nike.t4@test.com", "Nike Admin T4", "ACTIVE", "en", "UTC"),
                new AuthPrincipal.AuthIdentity("generic", "sub-nike-t4", "user.nike.t4@test.com", "Nike Admin T4")
        );

        // Attempting to access ACME's tenant environment as Nike user MUST throw Access Denied ApiError
        assertThatThrownBy(() -> iamService.listTenantMembers(nikeUserPrincipal, acmeTenantId))
                .isInstanceOf(ApiError.class)
                .hasMessageContaining("access");
    }

    @Test
    @DisplayName("TEST 5: Schema Isolation - ACME Schema A vs Nike Schema B Isolation Verification")
    void test5_SchemaIsolationVerification() {
        GenericOnboardResponse acmeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "JIOPLIX", "ACME_EXT_TEST5", "ACME_T5", "ACME T5 Hospital", "JIOPLIX_ENTERPRISE",
                "https://acme-t5.com", "user.acme.t5@test.com", "ACME Admin T5", "usr_acme_t5",
                "SCHEMA_PER_TENANT", "PRODUCTION", "acme_hospital_schema_t5", "ap-south-1", Map.of()
        ));

        GenericOnboardResponse nikeRes = onboardingService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "STOREAI", "NIKE_EXT_TEST5", "NIKE_T5", "Nike T5 Store", "STOREAI_ENTERPRISE",
                "https://nike-t5.com", "user.nike.t5@test.com", "Nike Admin T5", "usr_nike_t5",
                "SCHEMA_PER_TENANT", "PRODUCTION", "tenant_prod_storeai_nike_t5_db", "eu-west-1", Map.of()
        ));

        UUID acmeTenantId = UUID.fromString(acmeRes.tenantId());
        UUID nikeTenantId = UUID.fromString(nikeRes.tenantId());

        List<TenantResource> acmeResources = tenantResources.listByTenantId(acmeTenantId);
        List<TenantResource> nikeResources = tenantResources.listByTenantId(nikeTenantId);

        assertThat(acmeResources).isNotEmpty();
        assertThat(nikeResources).isNotEmpty();

        String acmeSchema = acmeResources.get(0).getSchemaName();
        String nikeSchema = nikeResources.get(0).getSchemaName();

        // Verify distinct schemas
        assertThat(acmeSchema).isNotEqualTo(nikeSchema);
        assertThat(acmeSchema).contains("acme");
        assertThat(nikeSchema).contains("nike");
    }

    @Test
    @DisplayName("TEST 6: Jioplix Product Onboarding & Subscription Activation for Tenant Contact Email (b.selvakumar@gmail.com)")
    void test6_JioplixSelvakumarOnboardingWithEmail() {
        GenericOnboardRequest request = new GenericOnboardRequest(
                "JIOPLIX",
                "HOSP_SELVA_01",
                "SELVA_HEALTHCARE",
                "Selvakumar Healthcare & Diagnostics",
                "JIOPLIX_ENTERPRISE",
                "https://selva-health.jioplix.com",
                "b.selvakumar@gmail.com",
                "Selvakumar B",
                "usr_selva_admin_01",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                "tenant_selva_jioplix_db",
                "ap-south-1",
                Map.of("hospitalName", "Selvakumar Healthcare & Diagnostics", "country", "India")
        );

        GenericOnboardResponse res = onboardingService.onboardTenant(platformAdminPrincipal, request);

        assertThat(res.status()).isIn("SUCCESS", "ALREADY_ONBOARDED");
        assertThat(res.tenantCode()).isEqualTo("SELVA_HEALTHCARE");
        assertThat(res.productCode()).isEqualTo("JIOPLIX");
        assertThat(res.planCode()).isEqualTo("JIOPLIX_ENTERPRISE");
        assertThat(res.schemaName()).contains("tenant_selva_jioplix_db");

        // Verify Tenant & Admin User Identity Created with b.selvakumar@gmail.com
        Optional<Tenant> tenantOpt = tenants.findByTenantCode("SELVA_HEALTHCARE");
        assertThat(tenantOpt).isPresent();

        Optional<User> userOpt = users.findByEmail("b.selvakumar@gmail.com");
        assertThat(userOpt).isPresent();
        assertThat(userOpt.get().getDisplayName()).isEqualTo("Selvakumar B");

        Optional<TenantMembership> tmOpt = memberships.findByTenant_IdAndUser_Id(tenantOpt.get().getId(), userOpt.get().getId());
        assertThat(tmOpt).isPresent();

        List<MembershipRole> roles = membershipRoles.findByMembership_Id(tmOpt.get().getId());
        assertThat(roles).isNotEmpty();
        assertThat(roles.stream().anyMatch(r -> r.getRole().getCode().equals("TENANT_ADMIN"))).isTrue();
    }
}
