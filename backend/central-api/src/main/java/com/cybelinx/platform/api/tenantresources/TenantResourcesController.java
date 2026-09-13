package com.cybelinx.platform.api.tenantresources;

import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenants.TenantViews;
import com.cybelinx.platform.api.tenantresources.dto.RegisterTenantResourceRequest;
import com.cybelinx.platform.api.tenantresources.dto.UpdateTenantResourceRequest;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Tenant resource registry REST surface. */
@RestController
@RequestMapping("/tenants/{tenantId}/resources")
public class TenantResourcesController {

    private final TenantResourcesService tenantResourcesService;

    public TenantResourcesController(TenantResourcesService tenantResourcesService) {
        this.tenantResourcesService = tenantResourcesService;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantViews.TenantResourceListResponse listResources(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantResourcesService.listResources(principal, tenantId);
    }

    @GetMapping("/{resourceId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantViews.TenantResourceView getResource(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID resourceId) {
        return tenantResourcesService.getResource(principal, tenantId, resourceId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantResourceView registerResource(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody RegisterTenantResourceRequest request) {
        return tenantResourcesService.registerResource(principal, tenantId, request);
    }

    @PatchMapping("/{resourceId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantResourceView updateResource(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID resourceId,
            @Valid @RequestBody UpdateTenantResourceRequest request) {
        return tenantResourcesService.updateResource(principal, tenantId, resourceId, request);
    }

    @DeleteMapping("/{resourceId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantResourceActionResponse removeResource(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID resourceId) {
        return tenantResourcesService.removeResource(principal, tenantId, resourceId);
    }
}