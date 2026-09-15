package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.NewStoreSignupRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.SingleStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreAiOnboardingResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreOnboardStatusView;
import com.cybelinx.platform.api.security.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for StoreAI Composable Commerce retail merchant onboarding operations.
 */
@RestController
@RequestMapping("/onboarding/storeai")
@Tag(name = "StoreAI Onboarding", description = "Onboarding pipeline for StoreAI retail merchant accounts into Cybelinx multi-tenant SaaS")
@SecurityRequirement(name = "bearerAuth")
public class StoreAiOnboardingController {

    private final StoreAiOnboardingService onboardingService;

    public StoreAiOnboardingController(StoreAiOnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @PostMapping("/single")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Onboard a single existing StoreAI retail merchant", description = "Registers external ID mapping, tenant creation, product attachment, schema isolation, and outbox event publishing")
    public StoreAiOnboardingResponse onboardSingle(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody SingleStoreOnboardRequest request) {
        return onboardingService.onboardExistingStore(principal, request);
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Batch onboard existing StoreAI retail merchant schemas", description = "Atomic multi-merchant batch onboarding for existing StoreAI retail schemas")
    public BatchStoreOnboardResponse onboardBatch(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BatchStoreOnboardRequest request) {
        return onboardingService.onboardBatch(principal, request);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "New SaaS retail merchant self-service signup", description = "Registers and provisions a new self-service StoreAI retail merchant account")
    public StoreAiOnboardingResponse signup(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody NewStoreSignupRequest request) {
        return onboardingService.signupNewStore(principal, request);
    }

    @GetMapping("/tenants/{externalId}")
    @Operation(summary = "Query StoreAI merchant onboarding status by external ID", description = "Inspects tenant mapping, subscription status, and schema isolation state for a StoreAI merchant")
    public StoreOnboardStatusView getStatusByExternalId(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String externalId) {
        return onboardingService.getOnboardingStatusByExternalId(principal, externalId);
    }
}
