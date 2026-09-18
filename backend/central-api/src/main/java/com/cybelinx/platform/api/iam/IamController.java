package com.cybelinx.platform.api.iam;

import com.cybelinx.platform.api.iam.IamViews.GrantRoleRequest;
import com.cybelinx.platform.api.iam.IamViews.SupportedIdpProviderView;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigRequest;
import com.cybelinx.platform.api.iam.IamViews.TenantIdpConfigResponse;
import com.cybelinx.platform.api.iam.IamViews.TenantMemberView;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** REST Controller for IAM (Identity & Access Management) tenant security & role configurations. */
@RestController
@RequestMapping("/iam")
public class IamController {

    private final IamService service;

    public IamController(IamService service) {
        this.service = service;
    }

    /** List supported Identity Provider integration metadata. */
    @GetMapping("/providers")
    public List<SupportedIdpProviderView> listSupportedProviders() {
        return service.listSupportedProviders();
    }

    /** Get tenant Identity Provider configuration. */
    @GetMapping("/tenants/{tenantId}/idp")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantIdpConfigResponse getTenantIdpConfig(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId) {
        return service.getTenantIdpConfig(principal, tenantId);
    }

    /** Update/configure tenant Identity Provider settings. */
    @PutMapping("/tenants/{tenantId}/idp")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantIdpConfigResponse upsertTenantIdpConfig(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody TenantIdpConfigRequest request) {
        return service.upsertTenantIdpConfig(principal, tenantId, request);
    }

    /** List tenant user memberships and granted RBAC roles. */
    @GetMapping("/tenants/{tenantId}/members")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public List<TenantMemberView> listTenantMembers(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId) {
        return service.listTenantMembers(principal, tenantId);
    }

    /** Add/invite a new member to a tenant. */
    @PostMapping("/tenants/{tenantId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantMemberView addTenantMember(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody IamViews.CreateTenantMemberRequest request) {
        return service.addTenantMember(principal, tenantId, request);
    }

    /** Grant an RBAC role to a user within a tenant. */
    @PostMapping("/tenants/{tenantId}/members/{userId}/roles")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantMemberView grantRole(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID userId,
            @Valid @RequestBody GrantRoleRequest request) {
        return service.grantRole(principal, tenantId, userId, request);
    }

    /** List all platform users and identity metadata. */
    @GetMapping("/users")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public List<IamViews.UserView> listPlatformUsers(
            @CurrentPrincipal AuthPrincipal principal) {
        return service.listPlatformUsers(principal);
    }
}
