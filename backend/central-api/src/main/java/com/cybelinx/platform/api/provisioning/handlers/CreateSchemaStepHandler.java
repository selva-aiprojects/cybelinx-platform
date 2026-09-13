package com.cybelinx.platform.api.provisioning.handlers;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.provisioning.ProvisioningStepHandler;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Concrete provisioning handler for {@code CREATE_SCHEMA} step (TRD §13/§14).
 * Creates the isolated PostgreSQL schema for the tenant if running in SCHEMA_PER_TENANT mode.
 */
@Component
public class CreateSchemaStepHandler implements ProvisioningStepHandler {

    private static final Logger log = LoggerFactory.getLogger(CreateSchemaStepHandler.class);
    private final JdbcTemplate jdbcTemplate;

    public CreateSchemaStepHandler(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String supportedStepName() {
        return "CREATE_SCHEMA";
    }

    @Override
    public void execute(ProvisioningJob job, ProvisioningStep step) {
        String tenantCode = job.getTenant().getTenantCode().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        String schemaName = "tenant_" + tenantCode;

        log.info("Executing CREATE_SCHEMA for tenant={} schema={}", job.getTenant().getTenantCode(), schemaName);

        // Execute DDL safely
        String safeSql = "CREATE SCHEMA IF NOT EXISTS \"" + schemaName.replace("\"", "\"\"") + "\"";
        jdbcTemplate.execute(safeSql);

        if (job.getTenantResource() != null) {
            job.getTenantResource().setSchemaName(schemaName);
        }

        step.setOutput(Map.of(
                "schemaName", schemaName,
                "created", true,
                "executedAt", LocalDateTime.now(ZoneOffset.UTC).toString()
        ));
    }
}
