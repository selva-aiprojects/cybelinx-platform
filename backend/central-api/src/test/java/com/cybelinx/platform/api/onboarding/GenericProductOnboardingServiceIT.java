package com.cybelinx.platform.api.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapterRegistry;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardStatusView;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.service.GenericProductOnboardingService;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
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
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration test verifying that the Generic Product Onboarding Framework handles
 * multi-product lifecycle orchestration (Jioplix, StoreAI) uniformly.
 */
@SpringBootTest
@Transactional
class GenericProductOnboardingServiceIT {

    @Autowired private GenericProductOnboardingService genericService;
    @Autowired private ProductAdapterRegistry registry;
    @Autowired private TenantRepository tenants;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private TenantExternalIdentifierRepository externalIds;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private UserRepository users;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private RoleRepository roles;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private AuditEventRepository auditEvents;

    private AuthPrincipal platformAdminPrincipal;

    @BeforeEach
    void setUp() {
        User adminUser = new User();
        adminUser.setEmail("generic-admin-" + UUID.randomUUID() + "@cybelinx.com");
        adminUser.setDisplayName("Platform Admin");
        adminUser = users.save(adminUser);

        Tenant sysTenant = new Tenant();
        sysTenant.setTenantCode("sys-" + UUID.randomUUID().toString().substring(0, 8));
        sysTenant.setName("System Tenant");
        sysTenant = tenants.save(sysTenant);

        TenantMembership sysMembership = new TenantMembership();
        sysMembership.setTenant(sysTenant);
        sysMembership.setUser(adminUser);
        sysMembership.setStatus(MembershipStatus.ACTIVE);
        sysMembership = memberships.save(sysMembership);

        Role adminRole = roles.findByCode(TenantConstants.PLATFORM_ADMIN_ROLE).orElseGet(() -> {
            Role r = new Role();
            r.setCode(TenantConstants.PLATFORM_ADMIN_ROLE);
            r.setName("Platform Admin");
            r.setScope(RoleScope.PLATFORM);
            return roles.save(r);
        });

        MembershipRole mr = new MembershipRole();
        mr.setMembership(sysMembership);
        mr.setRole(adminRole);
        membershipRoles.save(mr);

        AuthPrincipal.AuthUser authAdminUser = new AuthPrincipal.AuthUser(
                adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName(), "ACTIVE", "en", "UTC");
        AuthPrincipal.AuthIdentity authAdminIdent = new AuthPrincipal.AuthIdentity(
                "generic", "sub-admin-" + adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName());
        platformAdminPrincipal = new AuthPrincipal(authAdminUser, authAdminIdent);
    }

    @Test
    void shouldDiscoverAllRegisteredProductDefinitions() {
        List<ProductOnboardingDefinition> definitions = registry.getAvailableDefinitions();
        assertThat(definitions).isNotEmpty();
        assertThat(definitions).extracting(ProductOnboardingDefinition::productCode)
                .contains("JIOPLIX", "STOREAI", "SYNTHALYST", "LIMS");
    }

    @Test
    void everyAdapterDefaultPlanMustExistInCatalog() {
        List<ProductOnboardingDefinition> definitions = registry.getAvailableDefinitions();
        for (ProductOnboardingDefinition def : definitions) {
            com.cybelinx.platform.api.persistence.entity.Plan plan =
                    plans.findByProductIdAndPlanCode(
                                    products.findByProductCode(def.productCode()).orElseThrow().getId(),
                                    def.subscription().defaultPlanCode())
                            .orElse(null);
            assertThat(plan)
                    .as("Default plan %s for product %s must be registered", def.subscription().defaultPlanCode(), def.productCode())
                    .isNotNull();
        }
    }

    @Test
    void shouldOnboardJioplixViaGenericFramework() {
        String extId = "HOSP_GENERIC_" + UUID.randomUUID().toString().substring(0, 8);
        String tenantCode = "TENANT_JIO_" + UUID.randomUUID().toString().substring(0, 8);

        GenericOnboardRequest request = new GenericOnboardRequest(
                "JIOPLIX",
                extId,
                tenantCode,
                "Generic Apollo Healthcare",
                "JIOPLIX_ENTERPRISE",
                "https://apollo-generic.jioplix.com",
                "admin@apollo-gen.org",
                "Hospital Director",
                null,
                "SCHEMA_PER_TENANT",
                "DEVELOPMENT",
                null,
                null,
                Map.of("country", "India", "timezone", "Asia/Kolkata")
        );

        GenericOnboardResponse resp = genericService.onboardTenant(platformAdminPrincipal, request);

        assertThat(resp.status()).isEqualTo("SUCCESS");
        assertThat(resp.productCode()).isEqualTo("JIOPLIX");
        assertThat(resp.externalId()).isEqualTo(extId);
        assertThat(resp.provider()).isEqualTo("JIOPLIX_NEXUS");
        assertThat(resp.schemaName()).startsWith("jioplix_");
        assertThat(resp.executedSteps()).contains("VALIDATE_TENANT", "MAP_EXTERNAL_ID", "ATTACH_SUBSCRIPTION", "PROVISION_SCHEMA", "EMIT_OUTBOX_EVENT");

        // Status Lookup
        GenericOnboardStatusView status = genericService.getOnboardingStatus(platformAdminPrincipal, "JIOPLIX", extId);
        assertThat(status.externalId()).isEqualTo(extId);
        assertThat(status.tenantCode()).isEqualTo(tenantCode.toUpperCase());
        assertThat(status.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(status.resourceStatus()).isEqualTo("PROVISIONING");

        // Idempotency
        GenericOnboardResponse idempotent = genericService.onboardTenant(platformAdminPrincipal, request);
        assertThat(idempotent.status()).isEqualTo("ALREADY_ONBOARDED");
    }

    @Test
    void shouldOnboardStoreAiViaGenericFramework() {
        String extId = "STORE_GENERIC_" + UUID.randomUUID().toString().substring(0, 8);
        String tenantCode = "TENANT_STORE_" + UUID.randomUUID().toString().substring(0, 8);

        GenericOnboardRequest request = new GenericOnboardRequest(
                "STOREAI",
                extId,
                tenantCode,
                "Generic Puma Online",
                "STOREAI_ENTERPRISE",
                "https://puma-generic.storeai.com",
                "merchant@puma-gen.com",
                "Store Owner",
                "usr_puma_001",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                null,
                null,
                Map.of()
        );

        GenericOnboardResponse resp = genericService.onboardTenant(platformAdminPrincipal, request);

        assertThat(resp.status()).isEqualTo("SUCCESS");
        assertThat(resp.productCode()).isEqualTo("STOREAI");
        assertThat(resp.externalId()).isEqualTo(extId);
        assertThat(resp.provider()).isEqualTo("STOREAI_NEXUS");
        assertThat(resp.schemaName()).startsWith("storeai_");

        // Status Lookup
        GenericOnboardStatusView status = genericService.getOnboardingStatus(platformAdminPrincipal, "STOREAI", extId);
        assertThat(status.externalId()).isEqualTo(extId);
        assertThat(status.tenantCode()).isEqualTo(tenantCode.toUpperCase());
        assertThat(status.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(status.resourceStatus()).isEqualTo("PROVISIONING");
    }

    @Test
    void shouldOnboardSynthalystViaGenericFramework() {
        String externalId = "SYNTH_SMOKE_" + UUID.randomUUID().toString().substring(0, 8);
        GenericOnboardResponse response = genericService.onboardTenant(platformAdminPrincipal, new GenericOnboardRequest(
                "synthalyst", externalId, "SYNTH_SMOKE_" + UUID.randomUUID().toString().substring(0, 8),
                "Synthalyst Smoke Tenant", null, "https://synthalyst.cybelinx.com",
                "smoke-admin@example.test", "Smoke Admin", null, "schema_per_tenant", "development", null,
                "eu-west-1", Map.of()));

        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.productCode()).isEqualTo("SYNTHALYST");
        assertThat(response.provider()).isEqualTo("SYNTHALYST_HRM");
        assertThat(response.schemaName()).startsWith("synthalyst_");
        assertThat(response.resourceStatus()).isEqualTo("PROVISIONING");
    }

    @Test
    void shouldOnboardLimsViaGenericFramework() {
        String extId = "LIMS_GENERIC_" + UUID.randomUUID().toString().substring(0, 8);
        GenericOnboardRequest request = new GenericOnboardRequest(
                "LIMS",
                extId,
                "TENANT_LIMS_" + UUID.randomUUID().toString().substring(0, 8),
                "Generic Apollo Diagnostics Lab",
                "LIMS_STANDARD",
                "https://lab.apollo-lims.com",
                "admin@apollo-lab.org",
                "Lab Director",
                null,
                "SCHEMA_PER_TENANT",
                "DEVELOPMENT",
                null,
                null,
                Map.of("country", "India", "timezone", "Asia/Kolkata")
        );

        GenericOnboardResponse resp = genericService.onboardTenant(platformAdminPrincipal, request);

        assertThat(resp.status()).isEqualTo("SUCCESS");
        assertThat(resp.productCode()).isEqualTo("LIMS");
        assertThat(resp.externalId()).isEqualTo(extId);
        assertThat(resp.provider()).isEqualTo("LIMS_NEXUS");
        assertThat(resp.schemaName()).startsWith("lims_");
        assertThat(resp.executedSteps()).contains("VALIDATE_TENANT", "MAP_EXTERNAL_ID", "ATTACH_SUBSCRIPTION", "PROVISION_SCHEMA", "EMIT_OUTBOX_EVENT");

        GenericOnboardStatusView status = genericService.getOnboardingStatus(platformAdminPrincipal, "LIMS", extId);
        assertThat(status.externalId()).isEqualTo(extId);
        assertThat(status.tenantCode()).isEqualTo(request.tenantCode().toUpperCase());
        assertThat(status.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(status.resourceStatus()).isEqualTo("PROVISIONING");

        com.cybelinx.platform.api.persistence.entity.User adminUser =
                users.findByEmail("admin@apollo-lab.org").orElseThrow();
        com.cybelinx.platform.api.persistence.entity.TenantMembership membership =
                memberships.findByTenant_IdAndUser_Id(UUID.fromString(resp.tenantId()), adminUser.getId()).orElseThrow();
        assertThat(membershipRoles.findByMembership_Id(membership.getId()))
                .anyMatch(mr -> mr.getRole().getCode().equals(TenantConstants.TENANT_ADMIN_ROLE));
    }
}
