package com.cybelinx.platform.api.tenants;

import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantViews.CreateTenantResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantActionResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantDetailResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantListResponse;
import com.cybelinx.platform.api.tenants.dto.CreateTenantRequest;
import com.cybelinx.platform.api.tenants.dto.UpdateTenantRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Port of the NestJS {@code TenantsController}: the // tenants REST surface, guarded by the auth +
 * permission interceptor.
 */
@RestController
@RequestMapping("/tenants")
public class TenantsController {

    private final TenantsService tenantsService;

    public TenantsController(TenantsService tenantsService) {
        this.tenantsService = tenantsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public CreateTenantResponse createTenant(
            @CurrentPrincipal AuthPrincipal principal, @Valid @RequestBody CreateTenantRequest request) {
        return tenantsService.createTenant(principal, request);
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantListResponse listTenants(
            @CurrentPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) TenantStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort) {
        return tenantsService.listTenants(principal, new TenantsService.TenantListQuery(page, limit, status, search, sort));
    }

    @GetMapping("/{tenantId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantDetailResponse getTenant(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantsService.getTenant(principal, tenantId);
    }

    @PatchMapping("/{tenantId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantDetailResponse updateTenant(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody UpdateTenantRequest request) {
        return tenantsService.updateTenant(principal, tenantId, request);
    }

    @PostMapping("/{tenantId}/suspend")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantActionResponse suspendTenant(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantsService.suspendTenant(principal, tenantId);
    }

    @PostMapping("/{tenantId}/activate")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantActionResponse activateTenant(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantsService.activateTenant(principal, tenantId);
    }

    @DeleteMapping("/{tenantId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantActionResponse requestDeletion(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantsService.requestDeletion(principal, tenantId);
    }
}