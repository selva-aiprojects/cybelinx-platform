package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

/**
 * Universal response returned upon successful or idempotent onboarding.
 */
public record GenericOnboardResponse(
        String tenantId,
        String tenantCode,
        String tenantName,
        String productCode,
        String planCode,
        String externalId,
        String provider,
        String status,
        String tenantStatus,
        String resourceStatus,
        String schemaName,
        String message,
        String timestamp,
        List<String> executedSteps
) {}
