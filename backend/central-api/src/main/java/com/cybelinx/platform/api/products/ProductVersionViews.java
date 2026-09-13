package com.cybelinx.platform.api.products;

import java.util.List;

/** Response contracts for product versioning. */
public final class ProductVersionViews {

    public record ProductVersionView(
            String versionId,
            String version,
            String releaseNotes,
            boolean isCurrent,
            String publishedAt,
            String createdAt) {}

    public record ProductVersionListResponse(List<ProductVersionView> data) {}

    public record PublishVersionResponse(String versionId, String version, boolean isCurrent) {}

    private ProductVersionViews() {
    }
}