package com.cybelinx.platform.api.onboarding.model;

/**
 * Universal view for inspecting tenant onboarding and isolation state for any product.
 */
public record GenericOnboardStatusView(
        String externalId,
        String provider,
        String productCode,
        String tenantId,
        String tenantCode,
        String tenantName,
        String tenantStatus,
        String subscriptionStatus,
        String planCode,
        String resourceStatus,
        String schemaName,
        String isolationMode,
        String onboardedAt
) {}
