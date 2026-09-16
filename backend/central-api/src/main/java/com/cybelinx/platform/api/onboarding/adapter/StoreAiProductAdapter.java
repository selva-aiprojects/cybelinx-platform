package com.cybelinx.platform.api.onboarding.adapter;

import com.cybelinx.platform.api.onboarding.model.FormFieldDefinition;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.model.ResourceRequirement;
import com.cybelinx.platform.api.onboarding.model.SubscriptionRequirement;
import com.cybelinx.platform.api.onboarding.model.TenantIdentifierDefinition;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Product adapter for StoreAI Composable Commerce retail platform.
 */
@Component
public class StoreAiProductAdapter implements ProductAdapter {

    public static final String PRODUCT_CODE = "STOREAI";
    public static final String PROVIDER = "STOREAI_NEXUS";
    public static final String DEFAULT_PLAN = "STOREAI_ENTERPRISE";

    private final ProductOnboardingDefinition definition;

    public StoreAiProductAdapter() {
        this.definition = new ProductOnboardingDefinition(
                PRODUCT_CODE,
                "1.0.0",
                "StoreAI Composable Commerce",
                "Multi-brand autonomous retail engine, dynamic checkout, inventory management, and omnichannel commerce platform",
                PROVIDER,
                TenantIdentifierDefinition.of(
                        "externalId",
                        "Store External ID",
                        "e.g. STOREAI_NEXUS, STORE_NIKE_01",
                        "Merchant or store identifier in existing StoreAI retail database"
                ),
                List.of(
                        FormFieldDefinition.text("storeName", "Store / Merchant Name", true, "e.g. Nike Flagship Online", "Commercial name of the store or retail brand"),
                        FormFieldDefinition.url("storeDomain", "Store Domain / Storefront URL", false, "https://nike.storeai.com", "Custom or hosted storefront domain"),
                        FormFieldDefinition.email("merchantEmail", "Merchant Contact Email", true, "merchant@nike.com", "Primary merchant administrator email address"),
                        FormFieldDefinition.text("adminUserId", "Merchant Admin User ID", false, "usr_nike_owner_01", "Existing StoreAI merchant user identifier")
                ),
                SubscriptionRequirement.of(
                        DEFAULT_PLAN,
                        List.of("STOREAI_ENTERPRISE", "STOREAI_GROWTH", "STOREAI_STARTER")
                ),
                ResourceRequirement.schemaPerTenant("storeai_"),
                List.of(
                        "VALIDATE_TENANT",
                        "MAP_EXTERNAL_ID",
                        "ATTACH_SUBSCRIPTION",
                        "PROVISION_SCHEMA",
                        "EMIT_OUTBOX_EVENT"
                ),
                "/health"
        );
    }

    @Override
    public String getProductCode() {
        return PRODUCT_CODE;
    }

    @Override
    public ProductOnboardingDefinition getDefinition() {
        return definition;
    }

    @Override
    public String getDefaultProvider() {
        return PROVIDER;
    }

    @Override
    public String getDefaultPlanCode() {
        return DEFAULT_PLAN;
    }

    @Override
    public String computeSchemaName(String tenantCode, String requestedSchemaName) {
        if (requestedSchemaName != null && !requestedSchemaName.isBlank()) {
            return requestedSchemaName.trim().toLowerCase();
        }
        String cleanCode = tenantCode.toLowerCase().replaceAll("[^a-z0-9_]", "_");
        return "storeai_" + cleanCode;
    }

    @Override
    public void validateCustomFields(GenericOnboardRequest request) {
        // StoreAI-specific validations if any
    }

    @Override
    public Map<String, Object> enrichOutboxPayload(Tenant tenant, GenericOnboardRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("product_code", PRODUCT_CODE);
        payload.put("provider", PROVIDER);
        payload.put("external_id", request.externalId());
        payload.put("tenant_code", tenant.getTenantCode());
        if (request.domain() != null) {
            payload.put("store_domain", request.domain());
        }
        if (request.adminEmail() != null) {
            payload.put("merchant_email", request.adminEmail());
        }
        return payload;
    }
}
