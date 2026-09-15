package com.cybelinx.platform.api.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.JioplixOnboardingResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.NewSignupRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.OnboardStatusView;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.SingleOnboardRequest;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantExternalIdentifierRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** Integration tests for Jioplix (https://jioplix.com) Hospital Management System SaaS onboarding. */
@SpringBootTest
@Transactional
class JioplixOnboardingServiceIT {

    @Autowired private JioplixOnboardingService service;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantExternalIdentifierRepository externalIds;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private UserRepository users;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private RoleRepository roles;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private AuditEventRepository auditEvents;

    private AuthPrincipal platformAdminPrincipal;
    private AuthPrincipal regularUserPrincipal;

    @BeforeEach
    void setUp() {
        User adminUser = new User();
        adminUser.setEmail("admin-onboard-" + UUID.randomUUID() + "@cybelinx.com");
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

        User regularUser = new User();
        regularUser.setEmail("user-" + UUID.randomUUID() + "@hospital.com");
        regularUser.setDisplayName("Regular User");
        regularUser = users.save(regularUser);

        AuthPrincipal.AuthUser authRegUser = new AuthPrincipal.AuthUser(
                regularUser.getId(), regularUser.getEmail(), regularUser.getDisplayName(), "ACTIVE", "en", "UTC");
        AuthPrincipal.AuthIdentity authRegIdent = new AuthPrincipal.AuthIdentity(
                "generic", "sub-user-" + regularUser.getId(), regularUser.getEmail(), regularUser.getDisplayName());
        regularUserPrincipal = new AuthPrincipal(authRegUser, authRegIdent);
    }

    @Test
    void onboardExistingTenant_success() {
        SingleOnboardRequest request = new SingleOnboardRequest(
                "jio-hosp-001",
                "Apollo General Hospital",
                "apollo-gen-" + UUID.randomUUID().toString().substring(0, 6),
                "JIOPLIX_ENTERPRISE",
                "admin@apollo-hospital.com",
                "Dr. Apollo Admin",
                "SCHEMA_PER_TENANT",
                "DEVELOPMENT",
                "apollo_jioplix_schema"
        );

        JioplixOnboardingResponse response = service.onboardExistingTenant(platformAdminPrincipal, request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.externalId()).isEqualTo("jio-hosp-001");
        assertThat(response.provider()).isEqualTo("JIOPLIX_NEXUS");
        assertThat(response.productCode()).isEqualTo("JIOPLIX");
        assertThat(response.planCode()).isEqualTo("JIOPLIX_ENTERPRISE");

        UUID tenantId = UUID.fromString(response.tenantId());
        Tenant tenant = tenants.findById(tenantId).orElseThrow();
        assertThat(tenant.getName()).isEqualTo("Apollo General Hospital");

        TenantExternalIdentifier mapping = externalIds
                .findByProviderAndExternalId("JIOPLIX_NEXUS", "jio-hosp-001")
                .orElseThrow();
        assertThat(mapping.getTenant().getId()).isEqualTo(tenantId);

        assertThat(tenantProducts.findByTenantIdAndProductId(tenantId, mapping.getProduct().getId())).isPresent();
        assertThat(tenantResources.listByTenantId(tenantId)).isNotEmpty();

        List<AuditEvent> audit = auditEvents.findByTenant_Id(tenantId);
        assertThat(audit).isNotEmpty();
        assertThat(audit.get(0).getEntityType()).isEqualTo("tenant_onboarding");
    }

    @Test
    void onboardExistingTenant_idempotent() {
        String extId = "jio-hosp-dup-" + UUID.randomUUID().toString().substring(0, 6);
        String code = "hosp-code-" + UUID.randomUUID().toString().substring(0, 6);
        SingleOnboardRequest request = new SingleOnboardRequest(
                extId,
                "City Care Hospital",
                code,
                "JIOPLIX_ENTERPRISE",
                "admin@citycare.com",
                "City Admin",
                "SHARED_POOL",
                "DEVELOPMENT",
                null
        );

        JioplixOnboardingResponse resp1 = service.onboardExistingTenant(platformAdminPrincipal, request);
        assertThat(resp1.status()).isEqualTo("SUCCESS");

        JioplixOnboardingResponse resp2 = service.onboardExistingTenant(platformAdminPrincipal, request);
        assertThat(resp2.status()).isEqualTo("ALREADY_ONBOARDED");
        assertThat(resp2.tenantId()).isEqualTo(resp1.tenantId());
    }

    @Test
    void onboardBatch_success() {
        String code1 = "b1-" + UUID.randomUUID().toString().substring(0, 6);
        String code2 = "b2-" + UUID.randomUUID().toString().substring(0, 6);

        BatchOnboardRequest batchReq = new BatchOnboardRequest(List.of(
                new SingleOnboardRequest("ext-batch-1", "St Jude Hospital", code1, "JIOPLIX_ENTERPRISE", "admin@stjude.org", "Admin 1", null, null, null),
                new SingleOnboardRequest("ext-batch-2", "Mercy Hospital", code2, "JIOPLIX_ENTERPRISE", "admin@mercy.org", "Admin 2", null, null, null)
        ));

        BatchOnboardResponse response = service.onboardBatch(platformAdminPrincipal, batchReq);

        assertThat(response.totalRequested()).isEqualTo(2);
        assertThat(response.succeeded()).isEqualTo(2);
        assertThat(response.failed()).isEqualTo(0);
        assertThat(response.results()).hasSize(2);
    }

    @Test
    void signupNewTenant_success() {
        String code = "new-saas-" + UUID.randomUUID().toString().substring(0, 6);
        NewSignupRequest signupReq = new NewSignupRequest(
                "Sunrise Medical Center",
                code,
                "JIOPLIX_ENTERPRISE",
                "admin@sunrisemed.com",
                "Dr. Sunrise",
                "SCHEMA_PER_TENANT",
                "DEVELOPMENT"
        );

        JioplixOnboardingResponse response = service.signupNewTenant(platformAdminPrincipal, signupReq);

        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.externalId()).startsWith("jio_auto_");
        assertThat(response.productCode()).isEqualTo("JIOPLIX");
    }

    @Test
    void getOnboardingStatus_success() {
        String extId = "status-ext-" + UUID.randomUUID().toString().substring(0, 6);
        String code = "status-code-" + UUID.randomUUID().toString().substring(0, 6);
        SingleOnboardRequest request = new SingleOnboardRequest(
                extId, "Status Hospital", code, "JIOPLIX_ENTERPRISE", "a@b.com", "Admin", null, null, null);

        service.onboardExistingTenant(platformAdminPrincipal, request);

        OnboardStatusView status = service.getOnboardingStatusByExternalId(platformAdminPrincipal, extId);

        assertThat(status).isNotNull();
        assertThat(status.externalId()).isEqualTo(extId);
        assertThat(status.tenantStatus()).isEqualTo("ACTIVE");
        assertThat(status.subscriptionStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void onboardExistingTenant_missingPermission_throws403() {
        SingleOnboardRequest request = new SingleOnboardRequest(
                "ext-forbidden", "Forbidden Hosp", "forbid-code", "JIOPLIX_ENTERPRISE", null, null, null, null, null);

        assertThatThrownBy(() -> service.onboardExistingTenant(regularUserPrincipal, request))
                .isInstanceOf(ApiError.class)
                .extracting(e -> ((ApiError) e).getCode())
                .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED);
    }
}
