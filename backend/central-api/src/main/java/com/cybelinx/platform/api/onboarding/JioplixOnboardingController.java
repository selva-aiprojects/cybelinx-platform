package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.JioplixOnboardingResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.NewSignupRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.OnboardStatusView;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.SingleOnboardRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for formal onboarding and SaaS multi-tenant lifecycle management for the
 * Jioplix Hospital Management System (https://jioplix.com).
 */
@RestController
@RequestMapping("/api/v1/onboarding/jioplix")
public class JioplixOnboardingController {

    private final JioplixOnboardingService service;

    public JioplixOnboardingController(JioplixOnboardingService service) {
        this.service = service;
    }

    /** Onboard an existing Jioplix Hospital Management System tenant. */
    @PostMapping("/single")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public JioplixOnboardingResponse onboardExistingTenant(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody SingleOnboardRequest request) {
        return service.onboardExistingTenant(principal, request);
    }

    /** Bulk onboard multiple existing Jioplix Hospital Management System tenants. */
    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public BatchOnboardResponse onboardBatch(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody BatchOnboardRequest request) {
        return service.onboardBatch(principal, request);
    }

    /** Register and onboard a new self-service Jioplix Hospital Management System customer. */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public JioplixOnboardingResponse signupNewTenant(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody NewSignupRequest request) {
        return service.signupNewTenant(principal, request);
    }

    /** Lookup onboarding and multi-tenant SaaS status for a Jioplix hospital customer by external ID. */
    @GetMapping("/tenants/{externalId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public OnboardStatusView getOnboardingStatusByExternalId(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable String externalId) {
        return service.getOnboardingStatusByExternalId(principal, externalId);
    }
}
