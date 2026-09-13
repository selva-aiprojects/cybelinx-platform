package com.cybelinx.platform.api.entitlements;

import com.cybelinx.platform.api.domain.EntitlementStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.Map;

/**
 * Guarded entitlement state:
 * PENDING &#8594; ACTIVE; ACTIVE &#8596; SUSPENDED; ACTIVE &#8596; INACTIVE.
 */
public final class EntitlementTransitions {

    public static EntitlementStatus applyTransition(EntitlementStatus from, EntitlementStatus to) {
        boolean allowed = switch (from) {
            case PENDING -> to == EntitlementStatus.ACTIVE;
            case ACTIVE -> to == EntitlementStatus.SUSPENDED || to == EntitlementStatus.INACTIVE;
            case SUSPENDED -> to == EntitlementStatus.ACTIVE;
            case INACTIVE -> to == EntitlementStatus.ACTIVE;
        };
        if (!allowed) {
            throw new ApiError(
                    ErrorCode.ENTITLEMENT_STATUS_TRANSITION_INVALID,
                    "Entitlement status transition \"" + from + "\" -> \"" + to + "\" is not allowed",
                    Map.of("from", from.name(), "to", to.name()));
        }
        return to;
    }

    public static Map<String, Object> transitionDetails(EntitlementStatus from, EntitlementStatus to) {
        return Map.of("from", from.name(), "to", to.name());
    }

    private EntitlementTransitions() {
    }
}