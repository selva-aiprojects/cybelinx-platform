package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.BatchOnboardResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.JioplixOnboardingResponse;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.NewSignupRequest;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.OnboardStatusView;
import com.cybelinx.platform.api.onboarding.JioplixOnboardingViews.SingleOnboardRequest;
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
 * Facade over the universal {@link GenericProductOnboardingService} for Jioplix
 * (https://jioplix.com) Hospital Management System customers.
 *
 * <p>All dependency resolution (product/plan/region/resource catalog checks, tenant admin
 * identity with {@code TENANT_ADMIN} role, outbox publication, and deferred schema
 * provisioning) is delegated to the single product-agnostic onboarding engine so that
 * every product shares the same hardened pipeline.</p>
 */
@Service
public class JioplixOnboardingService {

    public static final String PRODUCT_JIOPLIX = "JIOPLIX";
    public static final String PROVIDER_JIOPLIX_NEXUS = "JIOPLIX_NEXUS";
    public static final String DEFAULT_PLAN_JIOPLIX = "JIOPLIX_ENTERPRISE";

    private final GenericProductOnboardingService genericOnboardingService;

    public JioplixOnboardingService(GenericProductOnboardingService genericOnboardingService) {
        this.genericOnboardingService = genericOnboardingService;
    }

    @Transactional
    public JioplixOnboardingResponse onboardExistingTenant(AuthPrincipal principal, SingleOnboardRequest request) {
        GenericOnboardResponse resp = genericOnboardingService.onboardTenant(principal, toGenericRequest(request));
        return toJioplixResponse(request, resp);
    }

    @Transactional
    public BatchOnboardResponse onboardBatch(AuthPrincipal principal, BatchOnboardRequest request) {
        List<GenericOnboardRequest> items = request.tenants().stream()
                .map(JioplixOnboardingService::toGenericRequest)
                .toList();
        GenericBatchOnboardResponse batch = genericOnboardingService.batchOnboard(
                principal, new GenericBatchOnboardRequest(items));

        List<JioplixOnboardingResponse> results = new ArrayList<>();
        for (int i = 0; i < batch.results().size(); i++) {
            results.add(toJioplixResponse(request.tenants().get(i), batch.results().get(i)));
        }

        return new BatchOnboardResponse(items.size(), batch.succeeded(), batch.failed(), results);
    }

    @Transactional
    public JioplixOnboardingResponse signupNewTenant(AuthPrincipal principal, NewSignupRequest request) {
        String autoExternalId = "jio_auto_" + UUID.randomUUID().toString().substring(0, 8);
        SingleOnboardRequest req = new SingleOnboardRequest(
                autoExternalId,
                request.tenantName(),
                request.tenantCode(),
                request.planCode(),
                request.adminEmail(),
                request.adminName(),
                request.isolationMode(),
                request.environment(),
                null
        );
        return onboardExistingTenant(principal, req);
    }

    @Transactional(readOnly = true)
    public OnboardStatusView getOnboardingStatusByExternalId(AuthPrincipal principal, String externalId) {
        GenericOnboardStatusView status = genericOnboardingService.getOnboardingStatus(
                principal, PRODUCT_JIOPLIX, externalId);
        return new OnboardStatusView(
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

    private static GenericOnboardRequest toGenericRequest(SingleOnboardRequest request) {
        return new GenericOnboardRequest(
                PRODUCT_JIOPLIX,
                request.externalId(),
                request.tenantCode(),
                request.tenantName(),
                request.planCode(),
                null,
                request.adminEmail(),
                request.adminName(),
                null,
                request.isolationMode(),
                request.environment(),
                request.schemaName(),
                null,
                Map.of()
        );
    }

    private static JioplixOnboardingResponse toJioplixResponse(SingleOnboardRequest request, GenericOnboardResponse resp) {
        return new JioplixOnboardingResponse(
                resp.tenantId(),
                resp.tenantCode(),
                resp.tenantName(),
                resp.productCode(),
                resp.planCode(),
                resp.externalId(),
                resp.provider() != null ? resp.provider() : PROVIDER_JIOPLIX_NEXUS,
                resp.status(),
                resp.resourceStatus(),
                resp.message() != null ? resp.message()
                        : "Tenant " + request.externalId() + " processing via Jioplix onboarding",
                resp.timestamp() != null ? resp.timestamp()
                        : LocalDateTime.now(ZoneOffset.UTC).toString()
        );
    }
}