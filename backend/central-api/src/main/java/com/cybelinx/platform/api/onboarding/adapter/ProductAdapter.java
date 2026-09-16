package com.cybelinx.platform.api.onboarding.adapter;

import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.util.Map;

/**
 * Strategy interface for product-specific onboarding behaviors and metadata definitions.
 * Each product integrates with the central platform by implementing this adapter.
 */
public interface ProductAdapter {

    /**
     * Unique product code (e.g. JIOPLIX, STOREAI, LIMS).
     */
    String getProductCode();

    /**
     * Complete declarative onboarding definition used by the Admin Portal and validation pipeline.
     */
    ProductOnboardingDefinition getDefinition();

    /**
     * Upstream provider code used in tenant external identifier mapping (e.g. JIOPLIX_NEXUS, STOREAI_NEXUS).
     */
    String getDefaultProvider();

    /**
     * Default subscription plan code if not specified by caller.
     */
    String getDefaultPlanCode();

    /**
     * Computes the isolated database schema name for the tenant according to product conventions.
     */
    String computeSchemaName(String tenantCode, String requestedSchemaName);

    /**
     * Validates product-specific business fields or constraints before committing.
     */
    void validateCustomFields(GenericOnboardRequest request);

    /**
     * Enriches outbox events with product-specific payload metadata.
     */
    Map<String, Object> enrichOutboxPayload(Tenant tenant, GenericOnboardRequest request);
}
