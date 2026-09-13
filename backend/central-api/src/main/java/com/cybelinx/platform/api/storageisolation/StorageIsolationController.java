package com.cybelinx.platform.api.storageisolation;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.resourceresolver.ResolvedTenantResource;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only surface for the trusted storage-isolation enforcer (§13). */
@RestController
@RequestMapping("/tenants/{tenantId}/products/{productId}/connection")
public class StorageIsolationController {

    private final StorageIsolationEnforcer isolationEnforcer;

    public StorageIsolationController(StorageIsolationEnforcer isolationEnforcer) {
        this.isolationEnforcer = isolationEnforcer;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public RuntimeConnectionContext connection(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "DEVELOPMENT") Environment environment) {
        return isolationEnforcer.enforce(principal, tenantId, productId, environment);
    }
}
