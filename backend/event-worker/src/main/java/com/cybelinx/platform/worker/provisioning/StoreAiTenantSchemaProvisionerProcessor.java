package com.cybelinx.platform.worker.provisioning;

import com.cybelinx.platform.worker.outbox.EventProcessor;
import com.cybelinx.platform.worker.outbox.OutboxEvent;
import com.cybelinx.platform.worker.outbox.WorkerProperties;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Dynamic PostgreSQL Schema-per-Tenant provisioner for StoreAI Composable Commerce.
 * Derived directly from the StoreAI product repository DDL schema script template
 * (`/product-schemas/storeai_tenant_schema.sql`).
 */
@Component
public class StoreAiTenantSchemaProvisionerProcessor implements EventProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(StoreAiTenantSchemaProvisionerProcessor.class);

    private final WorkerProperties properties;
    private final JdbcTemplate jdbcTemplate;

    public StoreAiTenantSchemaProvisionerProcessor(WorkerProperties properties, JdbcTemplate jdbcTemplate) {
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String consumerName() {
        return properties.getConsumerName();
    }

    @Override
    public boolean supports(String eventType) {
        return "TENANT_CREATED".equals(eventType)
                || "TENANT_EXTERNAL_ID_REGISTERED".equals(eventType)
                || "TENANT_PRODUCT_ATTACHED".equals(eventType);
    }

    @Override
    public void process(OutboxEvent event) {
        Map<String, Object> payload = event.getPayload();
        if (payload == null) return;

        String productCode = (String) payload.getOrDefault("productCode", "");
        String provider = (String) payload.getOrDefault("provider", "");

        if (!"STOREAI".equalsIgnoreCase(productCode) && !"STOREAI_NEXUS".equalsIgnoreCase(provider)) {
            return;
        }

        String tenantCode = (String) payload.getOrDefault("tenantCode", "STORE_MERCHANT");
        String schemaName = (String) payload.getOrDefault("schemaResourceName",
                "tenant_" + tenantCode.toLowerCase().replaceAll("[^a-z0-9_]", "_") + "_storeai");

        LOG.info("Provisioning StoreAI tenant target database schema: {} for tenant {}", schemaName, event.getTenantId());

        try {
            // 1. Load the product repository DDL template script
            String ddlTemplate = loadProductDdlTemplate("storeai");

            // 2. Substitute `${tenant_schema}` placeholder with the target tenant schema name
            String renderedDdl = ddlTemplate.replace("${tenant_schema}", schemaName);

            // 3. Execute rendered DDL statements against target PostgreSQL database
            for (String statement : renderedDdl.split(";")) {
                String sql = statement.trim();
                if (!sql.isEmpty()) {
                    jdbcTemplate.execute(sql);
                }
            }

            LOG.info("Successfully provisioned isolated target DDL schema: {} derived from StoreAI product repository", schemaName);
        } catch (Exception e) {
            LOG.error("Failed to provision StoreAI tenant schema: {}", schemaName, e);
            throw new RuntimeException("StoreAI schema provisioning failed", e);
        }
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
