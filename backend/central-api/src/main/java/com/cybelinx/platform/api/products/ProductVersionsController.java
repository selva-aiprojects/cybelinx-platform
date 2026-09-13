package com.cybelinx.platform.api.products;

import com.cybelinx.platform.api.products.dto.CreateProductVersionRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Product versioning REST surface, nested under a product. */
@RestController
@RequestMapping("/products/{productId}/versions")
public class ProductVersionsController {

    private final ProductVersionsService versionsService;

    public ProductVersionsController(ProductVersionsService versionsService) {
        this.versionsService = versionsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductVersionViews.ProductVersionView createVersion(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @Valid @RequestBody CreateProductVersionRequest request) {
        return versionsService.createVersion(principal, productId, request);
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductVersionViews.ProductVersionListResponse listVersions(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID productId) {
        return versionsService.listVersions(principal, productId);
    }

    @GetMapping("/{versionId}")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public ProductVersionViews.ProductVersionView getVersion(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID versionId) {
        return versionsService.getVersion(principal, productId, versionId);
    }

    @PutMapping("/{versionId}/publish")
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_WRITE)
    public ProductVersionViews.PublishVersionResponse publishVersion(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID productId,
            @PathVariable UUID versionId) {
        return versionsService.publishVersion(principal, productId, versionId);
    }
}