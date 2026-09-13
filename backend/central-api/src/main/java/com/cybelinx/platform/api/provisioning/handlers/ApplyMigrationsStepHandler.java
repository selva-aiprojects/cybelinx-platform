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
 * Concrete provisioning handler for {@code APPLY_MIGRATIONS} step (TRD §14).
 * Creates baseline metadata tracking table in the tenant-specific schema.
 */
@Component
public class ApplyMigrationsStepHandler implements ProvisioningStepHandler {

    private static final Logger log = LoggerFactory.getLogger(ApplyMigrationsStepHandler.class);
    private final JdbcTemplate jdbcTemplate;

    public ApplyMigrationsStepHandler(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String supportedStepName() {
        return "APPLY_MIGRATIONS";
    }

    @Override
    public void execute(ProvisioningJob job, ProvisioningStep step) {
        String tenantCode = job.getTenant().getTenantCode().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        String schemaName = "tenant_" + tenantCode;

        log.info("Executing APPLY_MIGRATIONS for schema={}", schemaName);

        String quotedSchema = "\"" + schemaName.replace("\"", "\"\"") + "\"";
        String createTableSql = "CREATE TABLE IF NOT EXISTS " + quotedSchema + ".tenant_metadata ("
                + "key VARCHAR(128) PRIMARY KEY, "
                + "value TEXT, "
                + "created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP"
                + ")";
        jdbcTemplate.execute(createTableSql);

        step.setOutput(Map.of(
                "migrationsApplied", true,
                "version", "1.0.0",
                "executedAt", LocalDateTime.now(ZoneOffset.UTC).toString()
        ));
    }
}
