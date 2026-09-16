package com.cybelinx.platform.api.iam;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.MembershipStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.iam.IamViews.GrantRoleRequest;
import com.cybelinx.platform.api.iam.IamViews.SupportedIdpProviderView;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigRequest;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigResponse;
import com.cybelinx.platform.api.iam.IamViews.TenantMemberView;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantIdpConfigRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import com.cybelinx.platform.api.persistence.entity.Role;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantIdpConfig;
import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for IAM (Identity & Access Management) tenant IdP configurations and RBAC control. */
@Service
public class IamService {

    private final TenantIdpConfigRepository idpConfigs;
    private final TenantRepository tenants;
    private final UserRepository users;
    private final TenantMembershipRepository memberships;
    private final RoleRepository roles;
    private final MembershipRoleRepository membershipRoles;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public IamService(
            TenantIdpConfigRepository idpConfigs,
            TenantRepository tenants,
            UserRepository users,
            TenantMembershipRepository memberships,
            RoleRepository roles,
            MembershipRoleRepository membershipRoles,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.idpConfigs = idpConfigs;
        this.tenants = tenants;
        this.users = users;
        this.memberships = memberships;
        this.roles = roles;
        this.membershipRoles = membershipRoles;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    public List<SupportedIdpProviderView> listSupportedProviders() {
        return List.of(
                new SupportedIdpProviderView("OIDC", "Generic OpenID Connect", "Standard OIDC discovery & JWKS verification", true, true),
                new SupportedIdpProviderView("KEYCLOAK", "Keycloak IAM", "Red Hat Keycloak enterprise identity broker", true, true),
                new SupportedIdpProviderView("AUTH0", "Auth0 by Okta", "Cloud identity platform with tenant domain isolation", true, true),
                new SupportedIdpProviderView("SUPABASE", "Supabase Auth", "PostgreSQL-native authentication suite", true, true),
                new SupportedIdpProviderView("OKTA", "Okta Workforce", "Enterprise SSO and OAuth2 identity platform", true, true),
                new SupportedIdpProviderView("CUSTOM_HMAC", "Shared Secret HMAC", "Development shared key HMAC signature verification", false, false)
        );
    }

    @Transactional(readOnly = true)
    public TenantIdpConfigResponse getTenantIdpConfig(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        Tenant tenant = requireTenant(tenantId);

        TenantIdpConfig config = idpConfigs.findByTenant_Id(tenant.getId())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "No Identity Provider configuration found for tenant " + tenantId,
                        Map.of("tenantId", tenantId.toString())));

        return toConfigResponse(config);
    }

    @Transactional
    public TenantIdpConfigResponse upsertTenantIdpConfig(AuthPrincipal principal, UUID tenantId, TenantIdpConfigRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        Tenant tenant = requireTenant(tenantId);

        TenantIdpConfig config = idpConfigs.findByTenant_Id(tenant.getId()).orElseGet(() -> {
            TenantIdpConfig c = new TenantIdpConfig();
            c.setTenant(tenant);
            return c;
        });

        config.setProviderType(request.providerType());
        config.setIssuer(request.issuer());
        config.setJwksUri(request.jwksUri());
        config.setAudience(request.audience());
        config.setClientId(request.clientId());
        config.setCredentialReference(request.credentialReference());
        if (request.enabled() != null) {
            config.setEnabled(request.enabled());
        }

        config = idpConfigs.save(config);

        writeAuditEvent(principal.user().id(), tenant, "iam.idp_config_updated", Map.of(
                "provider_type", config.getProviderType(),
                "issuer", config.getIssuer() != null ? config.getIssuer() : "",
                "enabled", config.isEnabled()
        ));

        return toConfigResponse(config);
    }

    @Transactional(readOnly = true)
    public List<TenantMemberView> listTenantMembers(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        requireTenant(tenantId);

        List<Object[]> rows = memberships.listByTenantWithRoleCodes(tenantId);
        List<TenantMemberView> members = new ArrayList<>();

        for (Object[] row : rows) {
            TenantMembership tm = (TenantMembership) row[0];
            String roleCode = (String) row[1];
            User u = tm.getUser();

            members.add(new TenantMemberView(
                    tm.getId().toString(),
                    u.getId().toString(),
                    u.getEmail(),
                    u.getDisplayName(),
                    tm.getStatus().name(),
                    roleCode != null ? List.of(roleCode) : List.of(),
                    List.of(),
                    IsoTime.format(tm.getCreatedAt())
            ));
        }

        return members;
    }

    @Transactional
    public TenantMemberView grantRole(AuthPrincipal principal, UUID tenantId, UUID userId, GrantRoleRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        Tenant tenant = requireTenant(tenantId);
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiError(ErrorCode.TENANT_NOT_FOUND, "User not found: " + userId, Map.of()));

        Role role = roles.findByCode(request.roleCode())
                .orElseThrow(() -> new ApiError(ErrorCode.RESOURCE_NOT_FOUND, "Role not found: " + request.roleCode(), Map.of()));

        TenantMembership tm = memberships.findByTenant_IdAndUser_Id(tenant.getId(), user.getId()).orElseGet(() -> {
            TenantMembership m = new TenantMembership();
            m.setTenant(tenant);
            m.setUser(user);
            m.setStatus(MembershipStatus.ACTIVE);
            return memberships.save(m);
        });

        MembershipRole mr = new MembershipRole();
        mr.setMembership(tm);
        mr.setRole(role);
        membershipRoles.save(mr);

        writeAuditEvent(principal.user().id(), tenant, "iam.role_granted", Map.of(
                "user_id", user.getId().toString(),
                "role_code", role.getCode()
        ));

        return new TenantMemberView(
                tm.getId().toString(),
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                tm.getStatus().name(),
                List.of(role.getCode()),
                List.of(),
                IsoTime.format(tm.getCreatedAt())
        );
    }

    @Transactional
    public TenantMemberView addTenantMember(AuthPrincipal principal, UUID tenantId, IamViews.CreateTenantMemberRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        Tenant tenant = requireTenant(tenantId);

        String email = request.email().trim().toLowerCase();
        User user = users.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setDisplayName(request.displayName() != null && !request.displayName().isBlank()
                    ? request.displayName().trim()
                    : email.split("@")[0]);
            newUser.setStatus(com.cybelinx.platform.api.domain.UserStatus.ACTIVE);
            return users.save(newUser);
        });

        TenantMembership tm = memberships.findByTenant_IdAndUser_Id(tenant.getId(), user.getId()).orElseGet(() -> {
            TenantMembership m = new TenantMembership();
            m.setTenant(tenant);
            m.setUser(user);
            m.setStatus(MembershipStatus.ACTIVE);
            return memberships.save(m);
        });

        List<String> assignedRoleCodes = new ArrayList<>();
        List<String> targetRoleCodes = (request.roleCodes() != null && !request.roleCodes().isEmpty())
                ? request.roleCodes()
                : List.of("TENANT_USER");

        for (String roleCode : targetRoleCodes) {
            roles.findByCode(roleCode.trim().toUpperCase()).ifPresent(role -> {
                boolean alreadyAssigned = membershipRoles.findByMembership_Id(tm.getId())
                        .stream()
                        .anyMatch(mr -> mr.getRole().getCode().equalsIgnoreCase(role.getCode()));
                if (!alreadyAssigned) {
                    MembershipRole mr = new MembershipRole();
                    mr.setMembership(tm);
                    mr.setRole(role);
                    membershipRoles.save(mr);
                }
                assignedRoleCodes.add(role.getCode());
            });
        }

        writeAuditEvent(principal.user().id(), tenant, "iam.member_added", Map.of(
                "user_id", user.getId().toString(),
                "email", user.getEmail(),
                "assigned_roles", assignedRoleCodes
        ));

        return new TenantMemberView(
                tm.getId().toString(),
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                tm.getStatus().name(),
                assignedRoleCodes,
                List.of(),
                IsoTime.format(tm.getCreatedAt())
        );
    }

    @Transactional(readOnly = true)
    public List<IamViews.UserView> listPlatformUsers(AuthPrincipal principal) {
        if (principal != null && principal.user() != null) {
            authorization.listAccess(principal.user().id());
        }

        List<User> allUsers = users.findAll();
        List<IamViews.UserView> views = new ArrayList<>();

        for (User u : allUsers) {
            int tenantCount = memberships.findByUser_Id(u.getId()).size();
            views.add(new IamViews.UserView(
                    u.getId().toString(),
                    u.getEmail(),
                    u.getDisplayName() != null ? u.getDisplayName() : u.getEmail(),
                    u.getStatus() != null ? u.getStatus().name() : "ACTIVE",
                    List.of("generic"),
                    tenantCount,
                    IsoTime.format(u.getCreatedAt())
            ));
        }

        return views;
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) return;
        var entry = access.stream().filter(e -> e.tenantId().equals(tenantId)).findFirst().orElse(null);
        if (entry == null || !entry.permissions().contains(permission)) {
            throw new ApiError(ErrorCode.TENANT_ACCESS_DENIED,
                    "You do not have \"" + permission + "\" access on tenant \"" + tenantId + "\"",
                    Map.of("tenantId", tenantId.toString(), "permission", permission));
        }
    }

    private Tenant requireTenant(UUID tenantId) {
        return tenants.findById(tenantId)
                .filter(t -> t.getStatus() != TenantStatus.DELETED)
                .orElseThrow(() -> new ApiError(ErrorCode.TENANT_NOT_FOUND,
                        "Tenant not found: " + tenantId, Map.of("tenantId", tenantId.toString())));
    }

    private TenantIdpConfigResponse toConfigResponse(TenantIdpConfig c) {
        return new TenantIdpConfigResponse(
                c.getId().toString(),
                c.getTenant().getId().toString(),
                c.getProviderType(),
                c.getIssuer(),
                c.getJwksUri(),
                c.getAudience(),
                c.getClientId(),
                c.getCredentialReference(),
                c.isEnabled(),
                IsoTime.format(c.getCreatedAt()),
                IsoTime.format(c.getUpdatedAt())
        );
    }

    private void writeAuditEvent(UUID actorUserId, Tenant tenant, String action, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        users.findById(actorUserId).ifPresent(event::setUser);
        event.setTenant(tenant);
        event.setActorType("USER");
        event.setEntityType("iam_config");
        event.setEntityId(tenant.getId());
        event.setAction(action);
        try {
            event.setMetadata(MAPPER.writeValueAsString(metadata));
        } catch (JsonProcessingException e) {
            event.setMetadata("{}");
        }
        auditEvents.save(event);
    }
}
