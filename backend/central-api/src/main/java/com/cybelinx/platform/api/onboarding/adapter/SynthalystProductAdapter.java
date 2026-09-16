package com.cybelinx.platform.api.onboarding.adapter;

import com.cybelinx.platform.api.onboarding.model.FormFieldDefinition;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.model.ResourceRequirement;
import com.cybelinx.platform.api.onboarding.model.SubscriptionRequirement;
import com.cybelinx.platform.api.onboarding.model.TenantIdentifierDefinition;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Onboarding contract for SynthalystHRM. Product-side shard creation remains asynchronous. */
@Component
public class SynthalystProductAdapter implements ProductAdapter {

    public static final String PRODUCT_CODE = "SYNTHALYST";
    public static final String PROVIDER = "SYNTHALYST_HRM";
    public static final String DEFAULT_PLAN = "SYNTHALYST_ENTERPRISE";

    private final ProductOnboardingDefinition definition = new ProductOnboardingDefinition(
            PRODUCT_CODE,
            "1.0.0",
            "SynthalystHRM",
            "AI-powered multi-tenant HRMS with organization-level isolation and Indian statutory compliance.",
            PROVIDER,
            TenantIdentifierDefinition.of(
                    "externalId", "Organization External ID", "e.g. SYNTHALYST_ORG_001",
                    "Immutable organization identifier in SynthalystHRM"),
            List.of(
                    FormFieldDefinition.text("organizationName", "Organization Name", true,
                            "e.g. Acme Technologies Pvt Ltd", "Legal or operating organization name"),
                    FormFieldDefinition.email("adminEmail", "Organization Admin Email", true,
                            "admin@acme.example", "Initial tenant administrator"),
                    FormFieldDefinition.select("subscriptionPlan", "Subscription Plan", true,
                            List.of(DEFAULT_PLAN), DEFAULT_PLAN, "SynthalystHRM subscription tier")),
            SubscriptionRequirement.of(DEFAULT_PLAN, List.of(DEFAULT_PLAN)),
            ResourceRequirement.schemaPerTenant("synthalyst_"),
            List.of("VALIDATE_TENANT", "MAP_EXTERNAL_ID", "ATTACH_SUBSCRIPTION", "PROVISION_SCHEMA", "EMIT_OUTBOX_EVENT"),
            "/health");

    @Override public String getProductCode() { return PRODUCT_CODE; }
    @Override public ProductOnboardingDefinition getDefinition() { return definition; }
    @Override public String getDefaultProvider() { return PROVIDER; }
    @Override public String getDefaultPlanCode() { return DEFAULT_PLAN; }

    @Override
    public String computeSchemaName(String tenantCode, String requestedSchemaName) {
        if (requestedSchemaName != null && !requestedSchemaName.isBlank()) return requestedSchemaName.trim().toLowerCase();
        return "synthalyst_" + tenantCode.toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    @Override
    public void validateCustomFields(GenericOnboardRequest request) {
        if (request.adminEmail() == null || request.adminEmail().isBlank()) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, "adminEmail is required for Synthalyst onboarding", Map.of("field", "adminEmail"));
        }
    }

    @Override
    public Map<String, Object> enrichOutboxPayload(Tenant tenant, GenericOnboardRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("productCode", PRODUCT_CODE);
        payload.put("provider", PROVIDER);
        payload.put("tenantCode", tenant.getTenantCode());
        payload.put("externalId", request.externalId());
        payload.put("adminEmail", request.adminEmail());
        payload.put("organizationName", tenant.getName());
        return payload;
    }
}
