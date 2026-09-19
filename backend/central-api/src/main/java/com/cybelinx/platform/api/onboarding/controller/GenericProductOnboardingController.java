package com.cybelinx.platform.api.onboarding.controller;

import com.cybelinx.platform.api.onboarding.adapter.GenericDynamicProductAdapter;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapter;
import com.cybelinx.platform.api.onboarding.adapter.ProductAdapterRegistry;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardStatusView;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.service.GenericProductOnboardingService;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the generic, definition-driven product onboarding framework.
 * Allows the Cybelinx Central SaaS Admin Portal to dynamically inspect onboarding definitions,
 * render product-specific onboarding schemas, provision isolated tenant schemas, and track onboarding state.
 */
@RestController
@RequestMapping("/onboarding")
@Tag(name = "Product Onboarding", description = "Universal definition-driven tenant onboarding engine for all platform products")
@SecurityRequirement(name = "bearerAuth")
public class GenericProductOnboardingController {

    private final ProductAdapterRegistry registry;
    private final GenericProductOnboardingService onboardingService;
    private final ProductRepository products;

    public GenericProductOnboardingController(
            ProductAdapterRegistry registry,
            GenericProductOnboardingService onboardingService,
            ProductRepository products) {
        this.registry = registry;
        this.onboardingService = onboardingService;
        this.products = products;
    }

    @GetMapping("/definitions")
    @Operation(summary = "List all available product onboarding definitions", description = "Returns declarative definitions for products actively registered in the Product Repository")
    public List<ProductOnboardingDefinition> listDefinitions() {
        List<Product> activeProducts = products.findAll().stream()
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .toList();

        List<ProductOnboardingDefinition> result = new ArrayList<>();
        for (Product product : activeProducts) {
            String code = product.getProductCode();
            Optional<ProductAdapter> adapterOpt = registry.findAdapter(code);
            if (adapterOpt.isPresent()) {
                result.add(adapterOpt.get().getDefinition());
            } else {
                result.add(new GenericDynamicProductAdapter(product).getDefinition());
            }
        }
        return result;
    }

    @GetMapping("/definitions/{productCode}")
    @Operation(summary = "Get onboarding definition for a specific product", description = "Returns the schema and form field specifications for a single product")
    public ProductOnboardingDefinition getDefinition(@PathVariable String productCode) {
        Product product = products.findByProductCode(productCode.toUpperCase())
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + productCode + "\" not found or not active in catalog",
                        Map.of("productCode", productCode)));
        return registry.findAdapter(productCode)
                .map(ProductAdapter::getDefinition)
                .orElseGet(() -> new GenericDynamicProductAdapter(product).getDefinition());
    }

    @PostMapping("/execute")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    @Operation(summary = "Execute tenant onboarding for any product", description = "Orchestrates tenant identity resolution, external identifier mapping, subscription creation, isolated schema provisioning, and transactional outbox publication")
    public GenericOnboardResponse executeOnboarding(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody GenericOnboardRequest request) {
        return onboardingService.onboardTenant(principal, request);
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    @Operation(summary = "Batch onboarding across multiple tenants or products")
    public GenericBatchOnboardResponse executeBatchOnboarding(
            @CurrentPrincipal AuthPrincipal principal,
            @Valid @RequestBody GenericBatchOnboardRequest request) {
        return onboardingService.batchOnboard(principal, request);
    }

    @GetMapping("/status/{productCode}/{externalId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    @Operation(summary = "Lookup tenant onboarding status by product and external ID")
    public GenericOnboardStatusView getOnboardingStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable String productCode,
            @PathVariable String externalId) {
        return onboardingService.getOnboardingStatus(principal, productCode, externalId);
    }
}
