package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor enforcing strict subscription entitlement checks per product access.
 * Ensures tenants cannot access unsubscribed or suspended products.
 */
@Component
public class SubscriptionEntitlementInterceptor implements HandlerInterceptor {

    private final TenantProductRepository tenantProducts;
    private final ProductRepository products;

    public SubscriptionEntitlementInterceptor(
            TenantProductRepository tenantProducts,
            ProductRepository products) {
        this.tenantProducts = tenantProducts;
        this.products = products;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Optional<UUID> tenantIdOpt = TenantContext.getTenantId();
        if (tenantIdOpt.isEmpty()) {
            return true;
        }

        String path = request.getRequestURI();
        String productCode = extractProductCodeFromPath(path);
        if (productCode == null) {
            return true;
        }

        UUID tenantId = tenantIdOpt.get();
        Optional<Product> productOpt = products.findByProductCode(productCode.toUpperCase());
        if (productOpt.isEmpty()) {
            return true;
        }

        Product product = productOpt.get();
        Optional<TenantProduct> subscriptionOpt = tenantProducts.findByTenantIdAndProductId(tenantId, product.getId());

        if (subscriptionOpt.isEmpty()) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ENTITLED,
                    "Subscription required: Tenant does not hold active subscription for product " + productCode,
                    Map.of("tenantId", tenantId, "productCode", productCode));
        }

        TenantProduct subscription = subscriptionOpt.get();
        if (subscription.getStatus() != TenantProductStatus.ACTIVE) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_ACTIVE,
                    "Subscription suspended: Product " + productCode + " subscription is currently " + subscription.getStatus(),
                    Map.of("tenantId", tenantId, "productCode", productCode, "status", subscription.getStatus()));
        }

        return true;
    }

    private String extractProductCodeFromPath(String path) {
        if (path == null) return null;
        if (path.contains("/products/")) {
            String[] segments = path.split("/products/");
            if (segments.length > 1) {
                String remainder = segments[1];
                int nextSlash = remainder.indexOf('/');
                return nextSlash > 0 ? remainder.substring(0, nextSlash) : remainder;
            }
        }
        return null;
    }
}
