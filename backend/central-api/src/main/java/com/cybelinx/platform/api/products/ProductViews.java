package com.cybelinx.platform.api.products;

import java.util.List;

/** Response contracts for the product registry. */
public final class ProductViews {

    public record ProductView(
            String productId,
            String productCode,
            String name,
            String description,
            String status,
            String currentVersionId,
            String createdAt) {}

    public record ProductListResponse(List<ProductView> data, Meta meta) {}

    public record Meta(int page, int limit, long total, long totalPages) {}

    public record ProductActionResponse(String productId, String status) {}

    private ProductViews() {
    }
}