package com.cybelinx.platform.api.products;

import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Guarded product lifecycle: DRAFT &#8594; ACTIVE &#8594; DEPRECATED &#8594; DISABLED.
 * ACTIVE may also be disabled directly; DISABLED is terminal.
 */
public final class ProductTransitions {

    public static ProductStatus applyTransition(ProductStatus from, ProductStatus to) {
        boolean allowed = switch (from) {
            case DRAFT -> to == ProductStatus.ACTIVE;
            case ACTIVE -> to == ProductStatus.DEPRECATED || to == ProductStatus.DISABLED;
            case DEPRECATED -> to == ProductStatus.DISABLED;
            case DISABLED -> false;
        };
        if (!allowed) {
            throw new ApiError(
                    ErrorCode.PRODUCT_STATUS_TRANSITION_INVALID,
                    "Product status transition \"" + from + "\" -> \"" + to + "\" is not allowed",
                    Map.of("from", from.name(), "to", to.name()));
        }
        return to;
    }

    public static Map<String, Object> transitionDetails(ProductStatus from, ProductStatus to) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("from", from.name());
        details.put("to", to.name());
        return details;
    }

    private ProductTransitions() {
    }
}