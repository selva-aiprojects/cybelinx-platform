package com.cybelinx.platform.api.onboarding.adapter;

import com.cybelinx.platform.api.onboarding.model.FormFieldDefinition;
import com.cybelinx.platform.api.onboarding.model.GenericOnboardRequest;
import com.cybelinx.platform.api.onboarding.model.ProductOnboardingDefinition;
import com.cybelinx.platform.api.onboarding.model.ResourceRequirement;
import com.cybelinx.platform.api.onboarding.model.SubscriptionRequirement;
import com.cybelinx.platform.api.onboarding.model.TenantIdentifierDefinition;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.util.List;
import java.util.Map;

/**
 * Dynamic fallback adapter for any product registered in the Product Repository
 * that does not have a compiled static adapter class.
 */
public class GenericDynamicProductAdapter implements ProductAdapter {

    private final Product product;

    public GenericDynamicProductAdapter(Product product) {
        this.product = product;
    }

    @Override
    public String getProductCode() {
        return product.getProductCode();
    }

    @Override
    public ProductOnboardingDefinition getDefinition() {
        String code = product.getProductCode();
        String prefix = product.getSchemaPrefix() != null && !product.getSchemaPrefix().isBlank()
                ? product.getSchemaPrefix()
                : (code.toLowerCase() + "_");
        return new ProductOnboardingDefinition(
                code,
                "1.0.0",
                product.getName(),
                product.getDescription() != null ? product.getDescription() : product.getName(),
                product.getHostingProvider() != null ? product.getHostingProvider() : "GENERIC",
                TenantIdentifierDefinition.of(
                        "externalId",
                        "External " + product.getName() + " ID",
                        code + "_TENANT_01",
                        "Unique upstream tenant identifier for " + product.getName()),
                List.of(
                        FormFieldDefinition.text("tenantName", "Organization Name", true, "e.g. Acme Corp", "Full legal tenant name"),
                        FormFieldDefinition.email("contactEmail", "Administrator Email", true, "admin@tenant.com", "Primary admin communication email"),
                        FormFieldDefinition.url("domain", "Custom Domain", false, "https://tenant." + (product.getDomain() != null ? product.getDomain() : "example.com"), "Dedicated tenant domain URL")
                ),
                SubscriptionRequirement.of("ENTERPRISE", List.of("ENTERPRISE", "PROFESSIONAL", "STARTER")),
                ResourceRequirement.schemaPerTenant(prefix),
                List.of("VALIDATE_IDENTITY", "CREATE_MEMBERSHIP", "PROVISION_SCHEMA", "PUBLISH_EVENT"),
                product.getHealthEndpoint() != null ? product.getHealthEndpoint() : "/health"
        );
    }

    @Override
    public String getDefaultProvider() {
        return product.getHostingProvider() != null ? product.getHostingProvider() : "GENERIC";
    }

    @Override
    public String getDefaultPlanCode() {
        return "ENTERPRISE";
    }

    @Override
    public String computeSchemaName(String tenantCode, String requestedSchemaName) {
        if (requestedSchemaName != null && !requestedSchemaName.isBlank()) {
            return requestedSchemaName.trim().toLowerCase();
        }
        String prefix = product.getSchemaPrefix() != null && !product.getSchemaPrefix().isBlank()
                ? product.getSchemaPrefix()
                : (product.getProductCode().toLowerCase() + "_");
        return prefix + tenantCode.trim().toLowerCase();
    }

    @Override
    public void validateCustomFields(GenericOnboardRequest request) {
        // Dynamic adapter permits standard onboarding fields without rigid custom schema
    }

    @Override
    public Map<String, Object> enrichOutboxPayload(Tenant tenant, GenericOnboardRequest request) {
        return Map.of(
                "productCode", product.getProductCode(),
                "tenantCode", tenant.getTenantCode(),
                "tenantId", tenant.getId().toString()
        );
    }
}
