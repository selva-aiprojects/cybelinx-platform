package com.cybelinx.platform.api.entitlements;

import com.cybelinx.platform.api.entitlements.dto.CreateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementRequest;
import com.cybelinx.platform.api.entitlements.dto.UpdateEntitlementStatusRequest;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Entitlement catalog REST surface, nested under a plan. */
@RestController
@RequestMapping("/products/{productId}/plans/{planId}/entitlements")
public class EntitlementsController {

    private final EntitlementsService entitlementsService;

    public EntitlementsController(EntitlementsService entitlementsService) {
        this.entitlementsService = entitlementsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public EntitlementViews.EntitlementView createEntitlement(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @Valid @RequestBody CreateEntitlementRequest request) {
        return entitlementsService.createEntitlement(principal, productId, planId, request);
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public EntitlementViews.EntitlementListResponse listEntitlements(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId) {
        return entitlementsService.listEntitlements(principal, productId, planId);
    }

    @GetMapping("/{entitlementId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public EntitlementViews.EntitlementView getEntitlement(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @PathVariable UUID entitlementId) {
        return entitlementsService.getEntitlement(principal, productId, planId, entitlementId);
    }

    @PutMapping("/{entitlementId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public EntitlementViews.EntitlementView updateEntitlement(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @PathVariable UUID entitlementId,
            @Valid @RequestBody UpdateEntitlementRequest request) {
        return entitlementsService.updateEntitlement(principal, productId, planId, entitlementId, request);
    }

    @PatchMapping("/{entitlementId}/status")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public EntitlementViews.EntitlementActionResponse updateEntitlementStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @PathVariable UUID entitlementId,
            @Valid @RequestBody UpdateEntitlementStatusRequest request) {
        return entitlementsService.updateEntitlementStatus(principal, productId, planId, entitlementId, request);
    }
}