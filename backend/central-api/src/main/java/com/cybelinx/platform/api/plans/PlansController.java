package com.cybelinx.platform.api.plans;

import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.plans.dto.CreatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanRequest;
import com.cybelinx.platform.api.plans.dto.UpdatePlanStatusRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Plan catalog REST surface, nested under a product. */
@RestController
@RequestMapping("/products/{productId}/plans")
public class PlansController {

    private final PlansService plansService;

    public PlansController(PlansService plansService) {
        this.plansService = plansService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public PlanViews.PlanView createPlan(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @Valid @RequestBody CreatePlanRequest request) {
        return plansService.createPlan(principal, productId, request);
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public PlanViews.PlanListResponse listPlans(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @RequestParam(required = false) PlanStatus status) {
        return plansService.listPlans(principal, productId, status);
    }

    @GetMapping("/{planId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public PlanViews.PlanView getPlan(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId) {
        return plansService.getPlan(principal, productId, planId);
    }

    @PutMapping("/{planId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public PlanViews.PlanView updatePlan(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdatePlanRequest request) {
        return plansService.updatePlan(principal, productId, planId, request);
    }

    @PatchMapping("/{planId}/status")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public PlanViews.PlanActionResponse updatePlanStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdatePlanStatusRequest request) {
        return plansService.updatePlanStatus(principal, productId, planId, request);
    }
}