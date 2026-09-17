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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Product adapter for LIMS (Laboratory Information Management System). */
@Component
public class LimsProductAdapter implements ProductAdapter {

    public static final String PRODUCT_CODE = "LIMS";
    public static final String PROVIDER = "LIMS_NEXUS";
    public static final String DEFAULT_PLAN = "LIMS_STANDARD";

    private final ProductOnboardingDefinition definition;

    public LimsProductAdapter() {
        this.definition = new ProductOnboardingDefinition(
                PRODUCT_CODE,
                "1.0.0",
                "LIMS Laboratory Information Management System",
                "Enterprise laboratory information management: sample tracking, quality control, regulatory compliance, and instrument integration",
                PROVIDER,
                TenantIdentifierDefinition.of(
                        "externalId",
                        "Laboratory External ID",
                        "e.g. LAB_APOLLO_01",
                        "External primary key in upstream LIMS laboratory database"
                ),
                List.of(
                        FormFieldDefinition.text("laboratoryName", "Laboratory Name", true, "e.g. Apollo Diagnostics Lab", "Official laboratory / diagnostic centre name"),
                        FormFieldDefinition.url("domain", "Laboratory Portal URL", false, "https://lab.apollo-lims.com", "Dedicated vanity or primary web domain"),
                        FormFieldDefinition.email("contactEmail", "Contact / Admin Email", true, "admin@lab.org", "Official email for platform administrative notices"),
                        FormFieldDefinition.text("country", "Country / Jurisdiction", false, "India", "Legal operating jurisdiction for laboratory compliance"),
                        FormFieldDefinition.text("timezone", "Timezone", false, "Asia/Kolkata", "Operating timezone for sample and report workflows"),
                        FormFieldDefinition.select("subscriptionPlan", "Subscription Plan", true,
                                List.of(DEFAULT_PLAN), DEFAULT_PLAN, "LIMS subscription tier")
                ),
                SubscriptionRequirement.of(
                        DEFAULT_PLAN,
                        List.of(DEFAULT_PLAN)
                ),
                ResourceRequirement.schemaPerTenant("lims_"),
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
        return "lims_" + cleanCode;
    }

    @Override
    public void validateCustomFields(GenericOnboardRequest request) {
        if (request.adminEmail() == null || request.adminEmail().isBlank()) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR,
                    "adminEmail is required for LIMS onboarding", Map.of("field", "adminEmail"));
        }
    }

    @Override
    public Map<String, Object> enrichOutboxPayload(Tenant tenant, GenericOnboardRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("product_code", PRODUCT_CODE);
        payload.put("provider", PROVIDER);
        payload.put("external_id", request.externalId());
        payload.put("tenant_code", tenant.getTenantCode());
        if (request.domain() != null) {
            payload.put("domain", request.domain());
        }
        if (request.adminEmail() != null) {
            payload.put("admin_email", request.adminEmail());
        }
        return payload;
    }
}