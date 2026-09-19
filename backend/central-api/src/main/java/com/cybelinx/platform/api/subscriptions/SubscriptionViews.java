package com.cybelinx.platform.api.subscriptions;

import com.cybelinx.platform.api.tenants.TenantViews.TenantView;
import java.util.List;

/** Response contracts for the subscription master and product repository screens. */
public final class SubscriptionViews {

    /** Master subscription row: tenant-product row plus its tenant and product context. */
    public record SubscriptionMasterView(
            String tenantProductId,
            String tenantId,
            String productCode,
            String planCode,
            String status,
            String activatedAt,
            String appUrl,
            TenantView tenant) {}

    public record SubscriptionMasterListResponse(List<SubscriptionMasterView> data) {}

    public record CreateSubscriptionResponse(SubscriptionMasterView subscription) {}

    public record SubscriptionActionResponse(
            String tenantProductId, String productCode, String tenantCode, String status) {}

    private SubscriptionViews() {
    }
}