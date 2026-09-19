package com.cybelinx.platform.api.productrepository;

import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryCustomerView;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryDetail;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryListResponse;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryView;
import com.cybelinx.platform.api.productrepository.dto.UpdateProductRepositoryCustomerRequest;
import com.cybelinx.platform.api.productrepository.dto.UpdateProductRepositoryRequest;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Product repository REST surface (deployment metadata + customers). */
@RestController
@RequestMapping("/product-repository")
public class ProductRepositoryController {

    private final ProductRepositoryService productRepositoryService;

    public ProductRepositoryController(ProductRepositoryService productRepositoryService) {
        this.productRepositoryService = productRepositoryService;
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductRepositoryListResponse list(
            @CurrentPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort) {
        return productRepositoryService.list(
                principal,
                new ProductRepositoryService.ProductRepositoryListQuery(page, limit, search, sort));
    }

    @GetMapping("/{productId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductRepositoryDetail get(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID productId) {
        return productRepositoryService.get(principal, productId);
    }

    @PutMapping("/{productId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductRepositoryView update(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @Valid @RequestBody UpdateProductRepositoryRequest request) {
        return productRepositoryService.update(principal, productId, request);
    }

    @PatchMapping("/{productId}/customers/{tenantId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductRepositoryCustomerView updateCustomer(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID tenantId,
            @Valid @RequestBody UpdateProductRepositoryCustomerRequest request) {
        return productRepositoryService.updateCustomer(principal, productId, tenantId, request);
    }
}