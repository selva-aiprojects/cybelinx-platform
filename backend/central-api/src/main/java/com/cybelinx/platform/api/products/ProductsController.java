package com.cybelinx.platform.api.products;

import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.products.dto.CreateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductStatusRequest;
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

/** Product registry REST surface, guarded by the auth + permission interceptor. */
@RestController
@RequestMapping("/products")
public class ProductsController {

    private final ProductsService productsService;

    public ProductsController(ProductsService productsService) {
        this.productsService = productsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductViews.ProductView createProduct(
            @CurrentPrincipal AuthPrincipal principal, @Valid @RequestBody CreateProductRequest request) {
        return productsService.createProduct(principal, request);
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductViews.ProductListResponse listProducts(
            @CurrentPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort) {
        return productsService.listProducts(
                principal, new ProductsService.ProductListQuery(page, limit, status, search, sort));
    }

    @GetMapping("/{productId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductViews.ProductView getProduct(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID productId) {
        return productsService.getProduct(principal, productId);
    }

    @PutMapping("/{productId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductViews.ProductView updateProduct(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @Valid @RequestBody UpdateProductRequest request) {
        return productsService.updateProduct(principal, productId, request);
    }

    @PatchMapping("/{productId}/status")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductViews.ProductActionResponse updateProductStatus(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @Valid @RequestBody UpdateProductStatusRequest request) {
        return productsService.updateProductStatus(principal, productId, request);
    }
}