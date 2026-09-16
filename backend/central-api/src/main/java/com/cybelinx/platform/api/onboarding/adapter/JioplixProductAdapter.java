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
 * Product adapter for Jioplix (https://jioplix.com) Hospital Management System.
 */
@Component
public class JioplixProductAdapter implements ProductAdapter {

    public static final String PRODUCT_CODE = "JIOPLIX";
    public static final String PROVIDER = "JIOPLIX_NEXUS";
    public static final String DEFAULT_PLAN = "JIOPLIX_ENTERPRISE";

    private final ProductOnboardingDefinition definition;

    public JioplixProductAdapter() {
        this.definition = new ProductOnboardingDefinition(
                PRODUCT_CODE,
                "1.0.0",
                "Jioplix Hospital Management System",
                "Enterprise clinical EHR, inpatient/outpatient hospital operations, and multi-facility healthcare platform",
                PROVIDER,
                TenantIdentifierDefinition.of(
                        "externalId",
                        "Hospital External ID",
                        "e.g. JIOPLIX_NEXUS, HOSP_APOLLO_01",
                        "External primary key in upstream Jioplix hospital database"
                ),
                List.of(
                        FormFieldDefinition.text("hospitalName", "Hospital Name", true, "e.g. Apollo Multispecialty Hospital", "Official healthcare institution name"),
                        FormFieldDefinition.url("domain", "Hospital Domain / Portal URL", false, "https://apollo.jioplix.com", "Dedicated vanity or primary web domain"),
                        FormFieldDefinition.email("contactEmail", "Contact / Admin Email", true, "admin@apollo.org", "Official email for platform administrative notices"),
                        FormFieldDefinition.text("country", "Country / Jurisdiction", false, "India", "Legal operating jurisdiction for healthcare compliance"),
                        FormFieldDefinition.text("timezone", "Timezone", false, "Asia/Kolkata", "Operating timezone for patient appointments and clinical logs")
                ),
                SubscriptionRequirement.of(
                        DEFAULT_PLAN,
                        List.of("JIOPLIX_ENTERPRISE", "HEALTHCARE_TIER", "CLINIC_STARTER")
                ),
                ResourceRequirement.schemaPerTenant("jioplix_"),
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
        return "jioplix_" + cleanCode;
    }

    @Override
    public void validateCustomFields(GenericOnboardRequest request) {
        // Jioplix-specific validations if any
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
