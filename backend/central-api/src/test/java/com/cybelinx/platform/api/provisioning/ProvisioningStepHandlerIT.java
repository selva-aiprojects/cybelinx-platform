package com.cybelinx.platform.api.provisioning;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.provisioning.handlers.ActivateResourceStepHandler;
import com.cybelinx.platform.api.provisioning.handlers.ApplyMigrationsStepHandler;
import com.cybelinx.platform.api.provisioning.handlers.CreateSchemaStepHandler;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Integration tests for individual ProvisioningStepHandlers (Capability 28). */
@SpringBootTest
@Transactional
class ProvisioningStepHandlerIT {

    @Autowired private CreateSchemaStepHandler createSchemaHandler;
    @Autowired private ApplyMigrationsStepHandler applyMigrationsHandler;
    @Autowired private ActivateResourceStepHandler activateResourceHandler;

    @Autowired private TenantRepository tenants;
    @Autowired private com.cybelinx.platform.api.persistence.ProductRepository products;
    @Autowired private com.cybelinx.platform.api.persistence.ResourceCatalogRepository catalog;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private JdbcTemplate jdbc;

    private String suffix;
    private Tenant tenant;
    private com.cybelinx.platform.api.persistence.entity.Product product;
    private com.cybelinx.platform.api.persistence.entity.Resource catalogResource;
    private TenantResource resource;
    private ProvisioningJob job;

    @BeforeEach
    void setUp() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toLowerCase();
        tenant = new Tenant();
        tenant.setTenantCode("handler_" + suffix);
        tenant.setName("Handler Test Corp");
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant = tenants.save(tenant);

        product = new com.cybelinx.platform.api.persistence.entity.Product();
        product.setProductCode("HANDLER_PROD_" + suffix);
        product.setName("Handler Product");
        product.setStatus(com.cybelinx.platform.api.domain.ProductStatus.ACTIVE);
        product = products.save(product);

        catalogResource = catalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            var r = new com.cybelinx.platform.api.persistence.entity.Resource();
            r.setResourceTypeCode("shared_pg_instance");
            r.setName("Shared PG Instance");
            return catalog.save(r);
        });

        resource = new TenantResource();
        resource.setTenant(tenant);
        resource.setProduct(product);
        resource.setResource(catalogResource);
        resource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
        resource.setEnvironment(Environment.DEVELOPMENT);
        resource.setStatus(TenantResourceStatus.PROVISIONING);
        resource.setProvisioningState(ProvisioningState.IN_PROGRESS);
        resource = tenantResources.save(resource);

        job = new ProvisioningJob();
        job.setTenant(tenant);
        job.setTenantResource(resource);
        job.setOperation(ProvisioningOperation.PROVISION);
        job.setState(ProvisioningState.IN_PROGRESS);
        job.setQueuedAt(LocalDateTime.now(ZoneOffset.UTC));
    }

    @Test
    void createSchemaHandler_createsSchemaAndSetsResourceSchemaName() {
        ProvisioningStep step = new ProvisioningStep();
        step.setName("CREATE_SCHEMA");
        step.setJob(job);
        step.setSequence(0);
        step.setStatus(ProvisioningStepStatus.IN_PROGRESS);

        createSchemaHandler.execute(job, step);

        String expectedSchema = "tenant_handler_" + suffix;
        assertThat(resource.getSchemaName()).isEqualTo(expectedSchema);
        assertThat(step.getOutput()).containsEntry("created", true);

        // Assert schema was created in PostgreSQL
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?",
                Integer.class,
                expectedSchema);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void applyMigrationsHandler_createsTenantMetadataTable() {
        String schemaName = "tenant_handler_" + suffix;
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS \"" + schemaName + "\"");

        ProvisioningStep step = new ProvisioningStep();
        step.setName("APPLY_MIGRATIONS");
        step.setJob(job);
        step.setSequence(1);
        step.setStatus(ProvisioningStepStatus.IN_PROGRESS);

        applyMigrationsHandler.execute(job, step);

        assertThat(step.getOutput()).containsEntry("migrationsApplied", true);

        // Assert table was created in tenant schema
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = 'tenant_metadata'",
                Integer.class,
                schemaName);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void activateResourceHandler_activatesResource() {
        ProvisioningStep step = new ProvisioningStep();
        step.setName("ACTIVATE_RESOURCE");
        step.setJob(job);
        step.setSequence(2);
        step.setStatus(ProvisioningStepStatus.IN_PROGRESS);

        activateResourceHandler.execute(job, step);

        assertThat(resource.getStatus()).isEqualTo(TenantResourceStatus.ACTIVE);
        assertThat(resource.getProvisioningState()).isEqualTo(ProvisioningState.SUCCEEDED);
        assertThat(step.getOutput()).containsEntry("resourceActivated", true);
    }
}
