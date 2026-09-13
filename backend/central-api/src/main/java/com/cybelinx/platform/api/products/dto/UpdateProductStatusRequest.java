package com.cybelinx.platform.api.products.dto;

import com.cybelinx.platform.api.domain.ProductStatus;
import jakarta.validation.constraints.NotNull;

/** Target status for {@code PATCH /products/{productId}/status}. */
public class UpdateProductStatusRequest {

    @NotNull(message = "status must be one of DRAFT, ACTIVE, DEPRECATED or DISABLED")
    private ProductStatus status;

    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }
}