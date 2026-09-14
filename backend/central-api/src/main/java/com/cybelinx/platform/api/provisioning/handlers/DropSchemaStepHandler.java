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
 * Concrete provisioning handler for {@code DROP_SCHEMA} step (TRD §14/§15).
 * Safely drops the tenant's isolated PostgreSQL schema during deprovisioning operations.
 */
@Component
public class DropSchemaStepHandler implements ProvisioningStepHandler {

    private static final Logger log = LoggerFactory.getLogger(DropSchemaStepHandler.class);
    private final JdbcTemplate jdbcTemplate;

    public DropSchemaStepHandler(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String supportedStepName() {
        return "DROP_SCHEMA";
    }

    @Override
    public void execute(ProvisioningJob job, ProvisioningStep step) {
        String tenantCode = job.getTenant().getTenantCode().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        String schemaName = "tenant_" + tenantCode;

        log.info("Executing DROP_SCHEMA for tenant={} schema={}", job.getTenant().getTenantCode(), schemaName);

        String safeSql = "DROP SCHEMA IF EXISTS \"" + schemaName.replace("\"", "\"\"") + "\" CASCADE";
        jdbcTemplate.execute(safeSql);

        if (job.getTenantResource() != null) {
            job.getTenantResource().setSchemaName(null);
        }

        step.setOutput(Map.of(
                "schemaName", schemaName,
                "dropped", true,
                "executedAt", LocalDateTime.now(ZoneOffset.UTC).toString()
        ));
    }
}
