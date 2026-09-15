package com.cybelinx.platform.api.onboarding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Data Transfer Objects (DTOs) for Jioplix (https://jioplix.com) tenant onboarding and SaaS subscription management.
 */
public class JioplixOnboardingViews {

    public record SingleOnboardRequest(
            @NotBlank(message = "externalId is required") String externalId,
            @NotBlank(message = "tenantName is required") String tenantName,
            @NotBlank(message = "tenantCode is required") String tenantCode,
            String planCode,
            String adminEmail,
            String adminName,
            String isolationMode,
            String environment,
            String schemaName
    ) {}

    public record BatchOnboardRequest(
            @NotNull(message = "tenants list cannot be null")
            @Valid
            List<SingleOnboardRequest> tenants
    ) {}

    public record NewSignupRequest(
            @NotBlank(message = "tenantName is required") String tenantName,
            @NotBlank(message = "tenantCode is required") String tenantCode,
            String planCode,
            String adminEmail,
            String adminName,
            String isolationMode,
            String environment
    ) {}

    public record JioplixOnboardingResponse(
            String tenantId,
            String tenantCode,
            String tenantName,
            String productCode,
            String planCode,
            String externalId,
            String provider,
            String status,
            String resourceState,
            String message,
            String onboardedAt
    ) {}

    public record BatchOnboardResponse(
            int totalRequested,
            int succeeded,
            int failed,
            List<JioplixOnboardingResponse> results
    ) {}

    public record OnboardStatusView(
            String externalId,
            String provider,
            String productCode,
            String tenantId,
            String tenantCode,
            String tenantStatus,
            String subscriptionStatus,
            String resourceStatus,
            String onboardedAt
    ) {}
}
