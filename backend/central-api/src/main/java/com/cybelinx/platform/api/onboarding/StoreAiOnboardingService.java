package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.NewStoreSignupRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.SingleStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreAiOnboardingResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreOnboardStatusView;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericBatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardResponse;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardStatusView;
import com.cybelinx.platform.api.onboarding.service.GenericProductOnboardingService;
import com.cybelinx.platform.api.security.AuthPrincipal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Facade over the universal {@link GenericProductOnboardingService} for StoreAI Composable
 * Commerce retail merchant customers.
 *
 * <p>All dependency resolution (product/plan/region/resource catalog checks, tenant admin
 * identity with {@code TENANT_ADMIN} role, outbox publication, and deferred schema
 * provisioning) is delegated to the single product-agnostic onboarding engine so that
 * every product shares the same hardened pipeline.</p>
 */
@Service
public class StoreAiOnboardingService {

    public static final String PRODUCT_STOREAI = "STOREAI";
    public static final String PROVIDER_STOREAI_NEXUS = "STOREAI_NEXUS";
    public static final String DEFAULT_PLAN_STOREAI = "STOREAI_ENTERPRISE";

    private final GenericProductOnboardingService genericOnboardingService;

    public StoreAiOnboardingService(GenericProductOnboardingService genericOnboardingService) {
        this.genericOnboardingService = genericOnboardingService;
    }

    @Transactional
    public StoreAiOnboardingResponse onboardExistingStore(AuthPrincipal principal, SingleStoreOnboardRequest request) {
        GenericOnboardResponse resp = genericOnboardingService.onboardTenant(principal, toGenericRequest(request));
        return toStoreAiResponse(request, resp);
    }

    @Transactional
    public BatchStoreOnboardResponse onboardBatch(AuthPrincipal principal, BatchStoreOnboardRequest request) {
        List<GenericOnboardRequest> items = request.stores().stream()
                .map(StoreAiOnboardingService::toGenericRequest)
                .toList();
        GenericBatchOnboardResponse batch = genericOnboardingService.batchOnboard(
                principal, new GenericBatchOnboardRequest(items));

        List<StoreAiOnboardingResponse> results = new ArrayList<>();
        for (int i = 0; i < batch.results().size(); i++) {
            results.add(toStoreAiResponse(request.stores().get(i), batch.results().get(i)));
        }

        return new BatchStoreOnboardResponse(items.size(), batch.succeeded(), batch.failed(), results);
    }

    @Transactional
    public StoreAiOnboardingResponse signupNewStore(AuthPrincipal principal, NewStoreSignupRequest request) {
        String autoExternalId = "store_auto_" + UUID.randomUUID().toString().substring(0, 8);
        GenericOnboardRequest generic = new GenericOnboardRequest(
                PRODUCT_STOREAI,
                autoExternalId,
                request.merchantCode(),
                request.merchantName(),
                request.planCode(),
                null,
                request.merchantEmail(),
                request.merchantEmail(),
                null,
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                null,
                request.regionCode(),
                request.country() != null ? Map.of("country", request.country()) : Map.of()
        );
        GenericOnboardResponse resp = genericOnboardingService.onboardTenant(principal, generic);
        return new StoreAiOnboardingResponse(
                resp.tenantId(),
                resp.tenantCode(),
                resp.tenantName(),
                resp.productCode(),
                resp.planCode(),
                resp.externalId(),
                resp.provider() != null ? resp.provider() : PROVIDER_STOREAI_NEXUS,
                resp.status(),
                resp.tenantStatus(),
                resp.message() != null ? resp.message()
                        : "StoreAI merchant " + autoExternalId + " successfully onboarded into SaaS platform",
                resp.timestamp() != null ? resp.timestamp()
                        : LocalDateTime.now(ZoneOffset.UTC).toString()
        );
    }

    @Transactional(readOnly = true)
    public StoreOnboardStatusView getOnboardingStatusByExternalId(AuthPrincipal principal, String externalId) {
        GenericOnboardStatusView status = genericOnboardingService.getOnboardingStatus(
                principal, PRODUCT_STOREAI, externalId);
        return new StoreOnboardStatusView(
                status.externalId(),
                status.provider(),
                status.productCode(),
                status.tenantId(),
                status.tenantCode(),
                status.tenantStatus(),
                status.subscriptionStatus(),
                status.resourceStatus(),
                status.onboardedAt()
        );
    }

    private static GenericOnboardRequest toGenericRequest(SingleStoreOnboardRequest request) {
        return new GenericOnboardRequest(
                PRODUCT_STOREAI,
                request.externalId(),
                request.tenantCode(),
                request.storeName(),
                request.planCode(),
                request.storeDomain(),
                request.merchantEmail(),
                request.merchantEmail(),
                request.adminUserId(),
                request.isolationMode(),
                request.environment(),
                request.schemaName(),
                null,
                Map.of()
        );
    }

    private static StoreAiOnboardingResponse toStoreAiResponse(SingleStoreOnboardRequest request, GenericOnboardResponse resp) {
        return new StoreAiOnboardingResponse(
                resp.tenantId(),
                resp.tenantCode(),
                resp.tenantName(),
                resp.productCode(),
                resp.planCode(),
                resp.externalId(),
                resp.provider() != null ? resp.provider() : PROVIDER_STOREAI_NEXUS,
                resp.status(),
                resp.tenantStatus(),
                resp.message() != null ? resp.message()
                        : "StoreAI merchant " + request.externalId() + " processing via StoreAI onboarding",
                resp.timestamp() != null ? resp.timestamp()
                        : LocalDateTime.now(ZoneOffset.UTC).toString()
        );
    }
}