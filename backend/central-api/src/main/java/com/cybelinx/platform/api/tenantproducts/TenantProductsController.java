package com.cybelinx.platform.api.tenantproducts;

import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenants.TenantViews;
import com.cybelinx.platform.api.tenantproducts.dto.AttachTenantProductRequest;
import com.cybelinx.platform.api.tenantproducts.dto.UpdateTenantProductStatusRequest;
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

/** Tenant-product subscription REST surface. */
@RestController
@RequestMapping("/tenants/{tenantId}/products")
public class TenantProductsController {

    private final TenantProductsService tenantProductsService;

    public TenantProductsController(TenantProductsService tenantProductsService) {
        this.tenantProductsService = tenantProductsService;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public TenantViews.TenantProductListResponse listProducts(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return tenantProductsService.listProducts(principal, tenantId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantProductView attachProduct(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody AttachTenantProductRequest request) {
        return tenantProductsService.attachProduct(principal, tenantId, request);
    }

    @PatchMapping("/{productId}/status")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantProductActionResponse updateProductStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID productId,
            @Valid @RequestBody UpdateTenantProductStatusRequest request) {
        return tenantProductsService.updateProductStatus(principal, tenantId, productId, request);
    }

    @DeleteMapping("/{productId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public TenantViews.TenantProductActionResponse detachProduct(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID productId) {
        return tenantProductsService.detachProduct(principal, tenantId, productId);
    }
}