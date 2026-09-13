package com.cybelinx.platform.api.resourceresolver;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenantresources.TenantResourcesService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only surface for the trusted resource resolver. */
@RestController
@RequestMapping("/tenants/{tenantId}/products/{productId}/resolve")
public class ResourceResolverController {

    private final TenantResourcesService tenantResourcesService;

    public ResourceResolverController(TenantResourcesService tenantResourcesService) {
        this.tenantResourcesService = tenantResourcesService;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public ResolvedTenantResource resolve(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "DEVELOPMENT") Environment environment) {
        return tenantResourcesService.resolveResource(principal, tenantId, productId, environment);
    }
}