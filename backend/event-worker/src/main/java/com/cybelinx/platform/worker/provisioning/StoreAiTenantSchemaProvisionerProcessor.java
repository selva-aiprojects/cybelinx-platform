package com.cybelinx.platform.worker.provisioning;

import com.cybelinx.platform.worker.outbox.EventProcessor;
import com.cybelinx.platform.worker.outbox.OutboxEvent;
import com.cybelinx.platform.worker.outbox.WorkerProperties;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Dynamic PostgreSQL Schema-per-Tenant provisioner for StoreAI Composable Commerce.
 * Executes target database DDL against the decoupled StoreAI Product Database server instance
 * via {@link TargetDatabaseConnectionResolver}.
 */
@Component
public class StoreAiTenantSchemaProvisionerProcessor implements EventProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(StoreAiTenantSchemaProvisionerProcessor.class);

    private final WorkerProperties properties;
    private final TargetDatabaseConnectionResolver connectionResolver;
    private final JdbcTemplate controlPlaneJdbcTemplate;

    public StoreAiTenantSchemaProvisionerProcessor(
            WorkerProperties properties,
            TargetDatabaseConnectionResolver connectionResolver,
            JdbcTemplate controlPlaneJdbcTemplate) {
        this.properties = properties;
        this.connectionResolver = connectionResolver;
        this.controlPlaneJdbcTemplate = controlPlaneJdbcTemplate;
    }

    @Override
    public String consumerName() {
        return properties.getConsumerName();
    }

    @Override
    public boolean supports(String eventType) {
        return "RESOURCE_CREATED".equals(eventType);
    }

    @Override
    public void process(OutboxEvent event) {
        Map<String, Object> payload = event.getPayload();
        if (payload == null) return;

        String productCode = stringValue(payload, "productCode", "product_code");
        String provider = stringValue(payload, "provider");

        if (!"STOREAI".equalsIgnoreCase(productCode) && !"STOREAI_NEXUS".equalsIgnoreCase(provider)) {
            return;
        }

        String tenantCode = stringValue(payload, "tenantCode", "tenant_code");
        if (tenantCode == null) tenantCode = "STORE_MERCHANT";
        String environment = stringValue(payload, "environment");
        if (environment == null) environment = "PRODUCTION";
        String customJdbcUrl = stringValue(payload, "jdbcUrl", "jdbc_url");
        String schemaName = stringValue(payload, "schemaResourceName", "schema_name");
        if (schemaName == null) schemaName = "tenant_" + tenantCode.toLowerCase().replaceAll("[^a-z0-9_]", "_") + "_storeai";

        LOG.info("Provisioning StoreAI tenant target database schema: {} on remote product server [{}]", schemaName, environment);

        try {
            // 1. Resolve remote target database connection for StoreAI product server
            JdbcTemplate targetJdbcTemplate = connectionResolver.resolveTargetJdbcTemplate("STOREAI", environment, customJdbcUrl);

            // 2. Load the product repository DDL template script
            String ddlTemplate = loadProductDdlTemplate("storeai");

            // 3. Substitute `${tenant_schema}` placeholder with the target tenant schema name
            String renderedDdl = ddlTemplate.replace("${tenant_schema}", schemaName);

            // 4. Execute rendered DDL statements remotely on the product database server
            for (String statement : renderedDdl.split(";")) {
                String sql = statement.trim();
                if (!sql.isEmpty()) {
                    targetJdbcTemplate.execute(sql);
                }
            }

            LOG.info("Successfully provisioned isolated target DDL schema: {} on remote StoreAI database server", schemaName);
            markResource(event.getEntityId(), "ACTIVE", "SUCCEEDED");
        } catch (Exception e) {
            markResource(event.getEntityId(), "FAILED", "FAILED");
            LOG.error("Failed to provision StoreAI tenant schema: {}", schemaName, e);
            throw new RuntimeException("StoreAI schema provisioning failed", e);
        }
    }

    private void markResource(UUID resourceId, String status, String provisioningState) {
        if (resourceId == null) return;
        controlPlaneJdbcTemplate.update(
                "UPDATE tenant_resources SET status = CAST(? AS \"TenantResourceStatus\"), "
                        + "provisioning_state = CAST(? AS \"ProvisioningState\"), updated_at = CURRENT_TIMESTAMP "
                        + "WHERE id = ?",
                status, provisioningState, resourceId);
    }

    private static String stringValue(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            Object value = payload.get(key);
            if (value != null) return String.valueOf(value);
        }
        return null;
    }

    private String loadProductDdlTemplate(String productCode) {
        try {
            ClassPathResource resource = new ClassPathResource("product-schemas/" + productCode.toLowerCase() + "_tenant_schema.sql");
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            LOG.warn("Could not load product DDL schema file for {}. Falling back to default schema template.", productCode, e);
            return "CREATE SCHEMA IF NOT EXISTS ${tenant_schema}; "
                    + "CREATE TABLE IF NOT EXISTS ${tenant_schema}.\"Product\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, sku VARCHAR(64) UNIQUE NOT NULL, price NUMERIC(10,2) DEFAULT 0.00); "
                    + "CREATE TABLE IF NOT EXISTS ${tenant_schema}.\"Stock\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES ${tenant_schema}.\"Product\"(id), quantity INT DEFAULT 0); "
                    + "CREATE TABLE IF NOT EXISTS ${tenant_schema}.\"Sale\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number VARCHAR(64) UNIQUE NOT NULL, total_amount NUMERIC(12,2) DEFAULT 0.00);";
        }
    }
}
