package com.cybelinx.platform.api.subscriptions;

import com.cybelinx.platform.api.subscriptions.SubscriptionViews.CreateSubscriptionResponse;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionActionResponse;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionMasterListResponse;
import com.cybelinx.platform.api.subscriptions.dto.CreateSubscriptionRequest;
import com.cybelinx.platform.api.subscriptions.dto.UpdateSubscriptionStatusRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
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

/** Platform subscription master REST surface. */
@RestController
@RequestMapping("/subscriptions")
public class SubscriptionsController {

    private final SubscriptionsService subscriptionsService;

    public SubscriptionsController(SubscriptionsService subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public SubscriptionMasterListResponse listSubscriptions(@CurrentPrincipal AuthPrincipal principal) {
        return subscriptionsService.listSubscriptions(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public CreateSubscriptionResponse createSubscription(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateSubscriptionRequest request) {
        return subscriptionsService.createSubscription(principal, request);
    }

    @PatchMapping("/{tenantProductId}/status")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public SubscriptionActionResponse updateStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantProductId,
            @Valid @RequestBody UpdateSubscriptionStatusRequest request) {
        return subscriptionsService.updateStatus(principal, tenantProductId, request);
    }

    @DeleteMapping("/{tenantProductId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public SubscriptionActionResponse detachSubscription(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantProductId) {
        return subscriptionsService.detachSubscription(principal, tenantProductId);
    }
}