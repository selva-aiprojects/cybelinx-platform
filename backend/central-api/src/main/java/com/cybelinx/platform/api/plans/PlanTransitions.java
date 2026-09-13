package com.cybelinx.platform.api.plans;

import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.Map;

/**
 * Guarded plan lifecycle: DRAFT &#8594; ACTIVE &#8594; RETIRED. RETIRED is terminal.
 */
public final class PlanTransitions {

    public static PlanStatus applyTransition(PlanStatus from, PlanStatus to) {
        boolean allowed = switch (from) {
            case DRAFT -> to == PlanStatus.ACTIVE;
            case ACTIVE -> to == PlanStatus.RETIRED;
            case RETIRED -> false;
        };
        if (!allowed) {
            throw new ApiError(
                    ErrorCode.PLAN_STATUS_TRANSITION_INVALID,
                    "Plan status transition \"" + from + "\" -> \"" + to + "\" is not allowed",
                    Map.of("from", from.name(), "to", to.name()));
        }
        return to;
    }

    public static Map<String, Object> transitionDetails(PlanStatus from, PlanStatus to) {
        return Map.of("from", from.name(), "to", to.name());
    }

    private PlanTransitions() {
    }
}