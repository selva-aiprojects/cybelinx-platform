package com.cybelinx.platform.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.RoleScope;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserIdentityRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.persistence.entity.UserIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.IdentityService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration coverage for the admin-portal email+password login: first-login bootstrap seeding of the
 * default password (hashed, never plaintext), bcrypt enforcement afterwards, and an immediately usable
 * HS256 portal JWT.
 */
@SpringBootTest(properties = {
        "cybelinx.idp.provider=generic",
        "cybelinx.idp.issuer=",
        "cybelinx.idp.audience=",
        "cybelinx.idp.jwt-secret=dev-secret-key-for-hs256-signing-only-00",
        "cybelinx.auth.bootstrap-password=Admin@123",
        "cybelinx.auth.token-ttl-hours=2",
})
@Transactional
class LoginServiceIT {

    @Autowired private LoginService loginService;
    @Autowired private IdentityService identityService;
    @Autowired private UserRepository users;
    @Autowired private UserIdentityRepository userIdentities;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private MembershipRoleRepository membershipRoles;
    @Autowired private RoleRepository roles;

    private String email;
    private String subject;

    @BeforeEach
    void setUp() {
        email = "login-" + UUID.randomUUID() + "@cybelinx.test";
        subject = "seed-login-sub-" + UUID.randomUUID();

        User user = new User();
        user.setEmail(email);
        user.setDisplayName("Login Tester");
        user = users.save(user);

        UserIdentity identity = new UserIdentity();
        identity.setUser(user);
        identity.setIdentityProvider("generic");
        identity.setExternalSubject(subject);
        identity.setEmail(email);
        identity.setPrimary(true);
        userIdentities.save(identity);

        Tenant tenant = new Tenant();
        tenant.setTenantCode("login-" + UUID.randomUUID().toString().substring(0, 6));
        tenant.setName("Login Tenant");
        tenant = tenants.save(tenant);

        TenantMembership membership = new TenantMembership();
        membership.setTenant(tenant);
        membership.setUser(user);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership = memberships.save(membership);

        Role adminRole = roles.findByCode(TenantConstants.PLATFORM_ADMIN_ROLE).orElseGet(() -> {
            Role r = new Role();
            r.setCode(TenantConstants.PLATFORM_ADMIN_ROLE);
            r.setName("Platform Admin");
            r.setScope(RoleScope.PLATFORM);
            return roles.save(r);
        });

        MembershipRole membershipRole = new MembershipRole();
        membershipRole.setMembership(membership);
        membershipRole.setRole(adminRole);
        membershipRoles.save(membershipRole);
    }

    @Test
    void unknownEmail_isRejectedUnauthorized() {
        assertThatThrownBy(() -> loginService.login(
                new LoginRequest("nobody-" + UUID.randomUUID() + "@cybelinx.test", "Admin@123")))
                .isInstanceOf(ApiHttpException.class)
                .satisfies(ex -> assertThat(((ApiHttpException) ex).getStatus()).isEqualTo(401));
    }

    @Test
    void wrongPasswordBeforeSeed_isRejectedAndSeedsNothing() {
        assertThatThrownBy(() -> loginService.login(new LoginRequest(email, "not-the-bootstrap-password")))
                .isInstanceOf(ApiHttpException.class)
                .satisfies(ex -> assertThat(((ApiHttpException) ex).getStatus()).isEqualTo(401));

        assertThat(users.findByEmail(email).orElseThrow().getPasswordHash()).isNull();
    }

    @Test
    void firstLogin_seedsBootstrapHash_andMintsUsableToken() {
        LoginResponse response = loginService.login(new LoginRequest(email, "Admin@123"));

        assertThat(response.token()).isNotBlank();
        assertThat(response.email()).isEqualTo(email);
        assertThat(response.sub()).isEqualTo(subject);
        assertThat(response.roles()).contains(TenantConstants.PLATFORM_ADMIN_ROLE);
        assertThat(response.isProductionSecret()).isTrue();

        User reloaded = users.findByEmail(email).orElseThrow();
        assertThat(reloaded.getPasswordHash()).isNotBlank().isNotEqualTo("Admin@123");

        IdentityService.ValidatedToken validated = identityService.validateToken(response.token());
        assertThat(validated.claims()).containsEntry("sub", subject).containsEntry("email", email);

        AuthPrincipal principal = identityService.resolvePrincipal(response.token());
        assertThat(principal.user().email()).isEqualTo(email);
    }

    @Test
    void afterSeed_wrongPassword_isRejectedUnauthorized() {
        loginService.login(new LoginRequest(email, "Admin@123"));

        assertThatThrownBy(() -> loginService.login(new LoginRequest(email, "tampered-password")))
                .isInstanceOf(ApiHttpException.class)
                .satisfies(ex -> assertThat(((ApiHttpException) ex).getStatus()).isEqualTo(401));
    }

    @Test
    void afterSeed_correctPassword_succeeds() {
        loginService.login(new LoginRequest(email, "Admin@123"));

        LoginResponse second = loginService.login(new LoginRequest(email, "Admin@123"));
        assertThat(second.token()).isNotBlank();
        assertThat(second.email()).isEqualTo(email);
        assertThat(second.sub()).isEqualTo(subject);
    }
}