package com.cybelinx.platform.api.tenantproducts;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.Map;

/**
 * Guarded tenant-product subscription state:
 * PROVISIONING &#8594; ACTIVE; ACTIVE &#8596; SUSPENDED; ACTIVE &#8596; LAPSED. DISABLED is terminal.
 */
public final class TenantProductTransitions {

    public static TenantProductStatus applyTransition(TenantProductStatus from, TenantProductStatus to) {
        boolean allowed = switch (from) {
            case PROVISIONING -> to == TenantProductStatus.ACTIVE;
            case ACTIVE -> to == TenantProductStatus.SUSPENDED || to == TenantProductStatus.LAPSED;
            case SUSPENDED -> to == TenantProductStatus.ACTIVE;
            case LAPSED -> to == TenantProductStatus.ACTIVE;
            case DISABLED -> false;
        };
        if (!allowed) {
            throw new ApiError(
                    ErrorCode.TENANT_PRODUCT_STATUS_TRANSITION_INVALID,
                    "Tenant-product status transition \"" + from + "\" -> \"" + to + "\" is not allowed",
                    Map.of("from", from.name(), "to", to.name()));
        }
        return to;
    }

    public static Map<String, Object> transitionDetails(TenantProductStatus from, TenantProductStatus to) {
        return Map.of("from", from.name(), "to", to.name());
    }

    private TenantProductTransitions() {
    }
}