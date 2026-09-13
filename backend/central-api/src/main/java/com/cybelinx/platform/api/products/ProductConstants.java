package com.cybelinx.platform.api.products;

/** Port of the product registry constants. */
public final class ProductConstants {

    public static final String PERMISSION_PRODUCT_READ = "product:read";
    public static final String PERMISSION_PRODUCT_WRITE = "product:write";

    /** Sort keys accepted by {@code GET /products}. */
    public static final String[] SORT_KEYS = {
        "createdAt", "-createdAt", "name", "-name", "productCode", "-productCode"
    };

    public static final String DEFAULT_SORT = "-createdAt";

    private ProductConstants() {
    }
}