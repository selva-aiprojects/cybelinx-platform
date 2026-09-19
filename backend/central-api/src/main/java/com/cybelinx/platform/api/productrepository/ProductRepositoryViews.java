package com.cybelinx.platform.api.productrepository;

import com.cybelinx.platform.api.products.ProductViews.Meta;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionMasterView;
import java.util.List;

/** Response contracts for the product repository screen. */
public final class ProductRepositoryViews {

    public record ProductRepositoryView(
            String repositoryId,
            String productId,
            String productCode,
            String domain,
            String databaseLocation,
            String databaseConnectionString,
            String configurationLocation,
            String updatedAt) {}

    public record ProductRepositoryListResponse(List<ProductRepositoryView> data, Meta meta) {}

    public record ProductRepositoryCustomerView(
            String tenantId,
            String tenantCode,
            String tenantName,
            String productCode,
            String tenantSchema,
            String databaseName,
            String contactPerson,
            String contactEmail) {}

    /** Detail view: repository metadata plus customers and subscriptions. */
    public record ProductRepositoryDetail(
            String repositoryId,
            String productId,
            String productCode,
            String domain,
            String databaseLocation,
            String databaseConnectionString,
            String configurationLocation,
            String updatedAt,
            List<ProductRepositoryCustomerView> customers,
            List<SubscriptionMasterView> subscriptions) {}

    private ProductRepositoryViews() {
    }
}