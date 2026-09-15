package com.cybelinx.platform.api.onboarding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Data transfer records for StoreAI Composable Commerce onboarding operations.
 */
public final class StoreAiOnboardingViews {

    private StoreAiOnboardingViews() {}

    public record SingleStoreOnboardRequest(
            @NotBlank(message = "externalId is required")
            @Size(max = 128)
            String externalId,

            @NotBlank(message = "storeName is required")
            @Size(max = 200)
            String storeName,

            @NotBlank(message = "tenantCode is required")
            @Pattern(regexp = "^[A-Z0-9_]{2,64}$", message = "tenantCode must be 2 to 64 chars (uppercase letters, digits, underscores)")
            String tenantCode,

            @Size(max = 64)
            String planCode,

            @Size(max = 256)
            String storeDomain,

            @Size(max = 256)
            String merchantEmail,

            @Size(max = 128)
            String adminUserId,

            @Size(max = 64)
            String isolationMode,

            @Size(max = 32)
            String environment,

            @Size(max = 128)
            String schemaName
    ) {}

    public record StoreAiOnboardingResponse(
            String tenantId,
            String tenantCode,
            String storeName,
            String productCode,
            String planCode,
            String externalId,
            String providerCode,
            String status,
            String tenantStatus,
            String message,
            String timestamp
    ) {}

    public record BatchStoreOnboardRequest(
            @NotEmpty(message = "stores list cannot be empty")
            @Valid
            List<SingleStoreOnboardRequest> stores
    ) {}

    public record BatchStoreOnboardResponse(
            int totalProcessed,
            int succeeded,
            int failed,
            List<StoreAiOnboardingResponse> results
    ) {}

    public record NewStoreSignupRequest(
            @NotBlank(message = "merchantCode is required")
            @Pattern(regexp = "^[A-Z0-9_]{2,64}$")
            String merchantCode,

            @NotBlank(message = "merchantName is required")
            String merchantName,

            @NotBlank(message = "merchantEmail is required")
            String merchantEmail,

            String planCode,
            String regionCode,
            String country
    ) {}

    public record StoreOnboardStatusView(
            String externalId,
            String providerCode,
            String productCode,
            String tenantId,
            String tenantCode,
            String tenantStatus,
            String subscriptionStatus,
            String resourceStatus,
            String provisionedAt
    ) {}
}
