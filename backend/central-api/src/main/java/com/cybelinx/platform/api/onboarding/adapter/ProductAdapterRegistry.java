package com.cybelinx.platform.api.onboarding.adapter;

import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Registry holding and discovering all registered {@link ProductAdapter} implementations.
 */
@Component
public class ProductAdapterRegistry {

    private final Map<String, ProductAdapter> adapterMap = new HashMap<>();

    public ProductAdapterRegistry(List<ProductAdapter> adapters) {
        if (adapters != null) {
            for (ProductAdapter adapter : adapters) {
                adapterMap.put(adapter.getProductCode().toUpperCase(), adapter);
            }
        }
    }

    public Optional<ProductAdapter> findAdapter(String productCode) {
        if (productCode == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(adapterMap.get(productCode.trim().toUpperCase()));
    }

    public ProductAdapter getRequiredAdapter(String productCode) {
        return findAdapter(productCode)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "No onboarding adapter registered for product: " + productCode,
                        Map.of("productCode", productCode != null ? productCode : "null")
                ));
    }

    public List<ProductOnboardingDefinition> getAvailableDefinitions() {
        return adapterMap.values().stream()
                .map(ProductAdapter::getDefinition)
                .toList();
    }

    public Map<String, ProductAdapter> getAllAdapters() {
        return Collections.unmodifiableMap(adapterMap);
    }
}
