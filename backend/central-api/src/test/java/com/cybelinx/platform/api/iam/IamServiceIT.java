package com.cybelinx.platform.api.iam;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.iam.IamViews.GrantRoleRequest;
import com.cybelinx.platform.api.iam.IamViews.SupportedIdpProviderView;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigRequest;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigResponse;
import com.cybelinx.platform.api.iam.IamViews.TenantMemberView;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
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

/** Integration tests for IAM (Identity & Access Management) tenant security & IdP configuration. */
@SpringBootTest
@Transactional
class IamServiceIT {

    @Autowired private IamService service;
    @Autowired private TenantRepository tenants;
    @Autowired private UserRepository users;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private RoleRepository roles;
    @Autowired private MembershipRoleRepository membershipRoles;

    private AuthPrincipal adminPrincipal;
    private AuthPrincipal regularPrincipal;
    private Tenant testTenant;
    private User testUser;

    @BeforeEach
    void setUp() {
        User adminUser = new User();
        adminUser.setEmail("iam-admin-" + UUID.randomUUID() + "@cybelinx.com");
        adminUser.setDisplayName("IAM Platform Admin");
        adminUser = users.save(adminUser);

        Tenant sysTenant = new Tenant();
        sysTenant.setTenantCode("iam-sys-" + UUID.randomUUID().toString().substring(0, 6));
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
                "generic", "sub-iam-admin-" + adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName());
        adminPrincipal = new AuthPrincipal(authAdminUser, authAdminIdent);

        testUser = new User();
        testUser.setEmail("hospital-user-" + UUID.randomUUID() + "@hospital.com");
        testUser.setDisplayName("Hospital Staff");
        testUser = users.save(testUser);

        AuthPrincipal.AuthUser authRegUser = new AuthPrincipal.AuthUser(
                testUser.getId(), testUser.getEmail(), testUser.getDisplayName(), "ACTIVE", "en", "UTC");
        AuthPrincipal.AuthIdentity authRegIdent = new AuthPrincipal.AuthIdentity(
                "generic", "sub-iam-user-" + testUser.getId(), testUser.getEmail(), testUser.getDisplayName());
        regularPrincipal = new AuthPrincipal(authRegUser, authRegIdent);

        testTenant = new Tenant();
        testTenant.setTenantCode("hosp-iam-" + UUID.randomUUID().toString().substring(0, 6));
        testTenant.setName("General Hospital IAM");
        testTenant.setStatus(TenantStatus.ACTIVE);
        testTenant = tenants.save(testTenant);
    }

    @Test
    void listSupportedProviders_returnsProviders() {
        List<SupportedIdpProviderView> providers = service.listSupportedProviders();
        assertThat(providers).isNotEmpty();
        assertThat(providers).extracting(SupportedIdpProviderView::providerCode)
                .contains("KEYCLOAK", "AUTH0", "SUPABASE", "OIDC");
    }

    @Test
    void upsertTenantIdpConfig_success() {
        TenantIdpConfigRequest request = new TenantIdpConfigRequest(
                "KEYCLOAK",
                "https://auth.hospital.com/realms/hospital-realm",
                "https://auth.hospital.com/realms/hospital-realm/protocol/openid-connect/certs",
                "cybelinx-saas",
                "hospital-client-id",
                "vault://dev/idp/hospital",
                true
        );

        TenantIdpConfigResponse response = service.upsertTenantIdpConfig(adminPrincipal, testTenant.getId(), request);

        assertThat(response).isNotNull();
        assertThat(response.tenantId()).isEqualTo(testTenant.getId().toString());
        assertThat(response.providerType()).isEqualTo("KEYCLOAK");
        assertThat(response.issuer()).isEqualTo("https://auth.hospital.com/realms/hospital-realm");
        assertThat(response.enabled()).isTrue();

        TenantIdpConfigResponse fetched = service.getTenantIdpConfig(adminPrincipal, testTenant.getId());
        assertThat(fetched.jwksUri()).contains("/protocol/openid-connect/certs");
    }

    @Test
    void grantRole_success() {
        GrantRoleRequest grantReq = new GrantRoleRequest(TenantConstants.PLATFORM_ADMIN_ROLE);
        TenantMemberView memberView = service.grantRole(adminPrincipal, testTenant.getId(), testUser.getId(), grantReq);

        assertThat(memberView).isNotNull();
        assertThat(memberView.userId()).isEqualTo(testUser.getId().toString());
        assertThat(memberView.roles()).contains(TenantConstants.PLATFORM_ADMIN_ROLE);
    }

    @Test
    void getTenantIdpConfig_missingPermission_throws403() {
        assertThatThrownBy(() -> service.getTenantIdpConfig(regularPrincipal, testTenant.getId()))
                .isInstanceOf(ApiError.class)
                .extracting(e -> ((ApiError) e).getCode())
                .isEqualTo(ErrorCode.TENANT_ACCESS_DENIED);
    }
}
