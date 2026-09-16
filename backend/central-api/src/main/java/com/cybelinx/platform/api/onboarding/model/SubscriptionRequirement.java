package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

/**
 * Subscription plan configuration and requirements for a product.
 */
public record SubscriptionRequirement(
        boolean required,
        String defaultPlanCode,
        List<String> availablePlans
) {
    public static SubscriptionRequirement of(String defaultPlanCode, List<String> availablePlans) {
        return new SubscriptionRequirement(true, defaultPlanCode, availablePlans);
    }
}
