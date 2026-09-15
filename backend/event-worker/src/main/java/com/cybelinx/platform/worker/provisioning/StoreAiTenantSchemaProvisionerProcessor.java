package com.cybelinx.platform.worker.provisioning;

import com.cybelinx.platform.worker.outbox.EventProcessor;
import com.cybelinx.platform.worker.outbox.OutboxEvent;
import com.cybelinx.platform.worker.outbox.WorkerProperties;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Dynamic PostgreSQL Schema-per-Tenant provisioner for StoreAI Composable Commerce.
 * Triggered automatically on outbox event handling when a tenant registers StoreAI.
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

        LOG.info("Provisioning StoreAI dynamic tenant schema: {} for tenant {}", schemaName, event.getTenantId());

        try {
            // 1. Create Isolated PostgreSQL Tenant Schema
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

            // 2. Provision Core Operational Tables inside Tenant Schema
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".\"Product\" ("
                    + "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                    + "name VARCHAR(255) NOT NULL, "
                    + "sku VARCHAR(64) UNIQUE NOT NULL, "
                    + "price NUMERIC(10,2) NOT NULL DEFAULT 0.00, "
                    + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    + ")");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".\"Stock\" ("
                    + "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                    + "product_id UUID REFERENCES " + schemaName + ".\"Product\"(id), "
                    + "quantity INT NOT NULL DEFAULT 0, "
                    + "warehouse_code VARCHAR(64) NOT NULL DEFAULT 'DEFAULT_WH'"
                    + ")");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".\"Sale\" ("
                    + "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "
                    + "invoice_number VARCHAR(64) UNIQUE NOT NULL, "
                    + "total_amount NUMERIC(12,2) NOT NULL, "
                    + "customer_email VARCHAR(255), "
                    + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    + ")");

            LOG.info("Successfully provisioned isolated DDL schema: {} for StoreAI merchant", schemaName);
        } catch (Exception e) {
            LOG.error("Failed to provision StoreAI tenant schema: {}", schemaName, e);
            throw new RuntimeException("StoreAI schema provisioning failed", e);
        }
    }
}
