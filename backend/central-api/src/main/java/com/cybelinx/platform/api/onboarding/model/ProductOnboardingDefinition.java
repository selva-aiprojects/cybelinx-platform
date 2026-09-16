package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

/**
 * Declarative onboarding definition contract for any product registered with Cybelinx.
 * The central platform uses this definition to dynamically render forms, validate inputs,
 * provision isolated schemas, bind subscription plans, and dispatch outbox event notifications.
 */
public record ProductOnboardingDefinition(
        String productCode,
        String version,
        String displayName,
        String description,
        String provider,
        TenantIdentifierDefinition tenantIdentifier,
        List<FormFieldDefinition> fields,
        SubscriptionRequirement subscription,
        ResourceRequirement resource,
        List<String> provisioningSteps,
        String healthCheckEndpoint
) {}
