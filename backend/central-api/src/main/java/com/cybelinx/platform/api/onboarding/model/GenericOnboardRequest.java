package com.cybelinx.platform.api.onboarding.model;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

/**
 * Universal onboarding request payload accepted by the generic onboarding endpoint.
 */
public record GenericOnboardRequest(
        @NotBlank(message = "productCode is required")
        String productCode,

        @NotBlank(message = "externalId is required")
        String externalId,

        @NotBlank(message = "tenantCode is required")
        String tenantCode,

        @NotBlank(message = "tenantName is required")
        String tenantName,

        String planCode,
        String domain,
        String adminEmail,
        String adminName,
        String adminUserId,
        String isolationMode,
        String environment,
        String schemaName,
        String regionCode,
        Map<String, Object> customFields
) {}
