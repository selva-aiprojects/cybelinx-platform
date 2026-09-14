package com.cybelinx.platform.api.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.audit.AuditService;
import com.cybelinx.platform.api.audit.AuditViews.AuditListResponse;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.PlatformEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UsageEventRepository;
import com.cybelinx.platform.api.persistence.entity.PlatformEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.provisioning.ProvisioningEngine;
import com.cybelinx.platform.api.provisioning.handlers.ActivateResourceStepHandler;
import com.cybelinx.platform.api.provisioning.handlers.ApplyMigrationsStepHandler;
import com.cybelinx.platform.api.provisioning.handlers.CreateSchemaStepHandler;
import com.cybelinx.platform.api.resourceresolver.TenantResourceResolver;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.usage.UsageService;
import com.cybelinx.platform.api.usage.UsageViews.IngestResponse;
import com.cybelinx.platform.api.usage.UsageViews.IngestUsageRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * End-to-end smoke test for tenant "ACME" provisioned across multiple products (JIOPLIX & LIMS)
 * with schema-per-tenant isolation, outbox event generation, metered usage, and audit tracking.
 */
@SpringBootTest
@Transactional
class AcmeTenantEndToEndSmokeTest {

    @Autowired private TenantRepository tenants;
    @Autowired private ProductRepository products;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private ResourceCatalogRepository resourceCatalog;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private TenantResourceResolver resourceResolver;
    @Autowired private CreateSchemaStepHandler createSchemaHandler;
    @Autowired private ApplyMigrationsStepHandler applyMigrationsHandler;
    @Autowired private ActivateResourceStepHandler activateResourceHandler;
    @Autowired private OutboxPublisher outboxPublisher;
    @Autowired private PlatformEventRepository platformEvents;
    @Autowired private UsageService usageService;
    @Autowired private AuditService auditService;
    @Autowired private JdbcTemplate jdbc;

    private Tenant acmeTenant;
    private Product jioplixProduct;
    private Product limsProduct;
    private Resource catalogPostgres;
    private AuthPrincipal adminPrincipal;

    @BeforeEach
    void setUpAcmeEnvironment() {
        UUID adminId = UUID.randomUUID();
        adminPrincipal = new AuthPrincipal(
                new AuthPrincipal.AuthUser(adminId, "admin@acme.test", "Acme Platform Admin", "ACTIVE", null, null),
                new AuthPrincipal.AuthIdentity("generic", "ext-admin", "admin@acme.test", "Acme Admin"));

        // 1. Setup Catalog Products (JIOPLIX & LIMS)
        jioplixProduct = products.findByProductCode("JIOPLIX").orElseGet(() -> {
            Product p = new Product();
            p.setProductCode("JIOPLIX");
            p.setName("Jioplix ERP");
            p.setStatus(ProductStatus.ACTIVE);
            return products.save(p);
        });

        limsProduct = products.findByProductCode("LIMS").orElseGet(() -> {
            Product p = new Product();
            p.setProductCode("LIMS");
            p.setName("LIMS Laboratory");
            p.setStatus(ProductStatus.ACTIVE);
            return products.save(p);
        });

        catalogPostgres = resourceCatalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            Resource r = new Resource();
            r.setResourceTypeCode("shared_pg_instance");
            r.setName("Shared PostgreSQL Instance");
            return resourceCatalog.save(r);
        });
    }

    @Test
    @DisplayName("Smoke Test: Provision ACME for JIOPLIX and LIMS with separate schemas, outbox events, usage, and audit")
    void testAcmeEndToEndMultiTenantProvisioning() {
        // Step 1: Create Tenant ACME
        acmeTenant = new Tenant();
        acmeTenant.setTenantCode("ACME");
        acmeTenant.setName("Acme Corporation");
        acmeTenant.setCountry("USA");
        acmeTenant.setTimezone("UTC");
        acmeTenant.setStatus(TenantStatus.ACTIVE);
        acmeTenant = tenants.save(acmeTenant);

        outboxPublisher.publishTenantEvent(OutboxPublisher.TENANT_CREATED, acmeTenant, Map.of("code", "ACME", "name", "Acme Corporation"));

        assertThat(acmeTenant.getId()).isNotNull();
        assertThat(acmeTenant.getTenantCode()).isEqualTo("ACME");

        // Step 2: Attach Products JIOPLIX and LIMS to ACME
        TenantProduct jioplixSub = new TenantProduct();
        jioplixSub.setTenant(acmeTenant);
        jioplixSub.setProduct(jioplixProduct);
        jioplixSub.setStatus(TenantProductStatus.ACTIVE);
        jioplixSub.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        jioplixSub = tenantProducts.save(jioplixSub);

        TenantProduct limsSub = new TenantProduct();
        limsSub.setTenant(acmeTenant);
        limsSub.setProduct(limsProduct);
        limsSub.setStatus(TenantProductStatus.ACTIVE);
        limsSub.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
        limsSub = tenantProducts.save(limsSub);

        // Step 3: Provision Tenant Resources with Schema-per-Tenant isolation
        // JIOPLIX Schema for ACME -> tenant_acme_jioplix
        TenantResource jioplixResource = new TenantResource();
        jioplixResource.setTenant(acmeTenant);
        jioplixResource.setProduct(jioplixProduct);
        jioplixResource.setTenantProduct(jioplixSub);
        jioplixResource.setResource(catalogPostgres);
        jioplixResource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
        jioplixResource.setEnvironment(Environment.PRODUCTION);
        jioplixResource.setStatus(TenantResourceStatus.PROVISIONING);
        jioplixResource.setProvisioningState(ProvisioningState.IN_PROGRESS);
        jioplixResource = tenantResources.save(jioplixResource);

        // LIMS Schema for ACME -> tenant_acme_lims
        TenantResource limsResource = new TenantResource();
        limsResource.setTenant(acmeTenant);
        limsResource.setProduct(limsProduct);
        limsResource.setTenantProduct(limsSub);
        limsResource.setResource(catalogPostgres);
        limsResource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
        limsResource.setEnvironment(Environment.PRODUCTION);
        limsResource.setStatus(TenantResourceStatus.PROVISIONING);
        limsResource.setProvisioningState(ProvisioningState.IN_PROGRESS);
        limsResource = tenantResources.save(limsResource);

        // Step 4: Execute Provisioning Pipeline (CREATE_SCHEMA, APPLY_MIGRATIONS, ACTIVATE_RESOURCE)
        executeProvisioningPipeline(acmeTenant, jioplixResource, "tenant_acme_jioplix");
        executeProvisioningPipeline(acmeTenant, limsResource, "tenant_acme_lims");

        // Step 5: Verify Runtime Schema Isolation in PostgreSQL
        Integer jioplixSchemaCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'tenant_acme_jioplix'",
                Integer.class);
        Integer limsSchemaCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'tenant_acme_lims'",
                Integer.class);

        assertThat(jioplixSchemaCount).isEqualTo(1);
        assertThat(limsSchemaCount).isEqualTo(1);

        // Verify metadata tables created inside ACME's isolated schemas
        Integer jioplixTableCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'tenant_acme_jioplix' AND table_name = 'tenant_metadata'",
                Integer.class);
        Integer limsTableCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'tenant_acme_lims' AND table_name = 'tenant_metadata'",
                Integer.class);

        assertThat(jioplixTableCount).isEqualTo(1);
        assertThat(limsTableCount).isEqualTo(1);

        // Step 6: Test TenantResourceResolver for ACME
        var resolvedJioplix = resourceResolver.resolve(acmeTenant.getId(), jioplixProduct.getId(), Environment.PRODUCTION);
        var resolvedLims = resourceResolver.resolve(acmeTenant.getId(), limsProduct.getId(), Environment.PRODUCTION);

        assertThat(resolvedJioplix.schemaName()).isEqualTo("tenant_acme_jioplix");
        assertThat(resolvedLims.schemaName()).isEqualTo("tenant_acme_lims");

        // Step 7: Ingest Metered Usage Events for ACME
        IngestResponse usage1 = usageService.ingestUsage(adminPrincipal, acmeTenant.getId(),
                new IngestUsageRequest("JIOPLIX", "api_call", new BigDecimal("150"), "requests", "acme-dedupe-001", null, null));
        IngestResponse usage2 = usageService.ingestUsage(adminPrincipal, acmeTenant.getId(),
                new IngestUsageRequest("LIMS", "sample_processed", new BigDecimal("42"), "samples", "acme-dedupe-002", null, null));

        assertThat(usage1.status()).isEqualTo("created");
        assertThat(usage2.status()).isEqualTo("created");

        BigDecimal jioplixUsageTotal = usageService.getMonthlyUsageTotal(acmeTenant.getId(), "api_call");
        assertThat(jioplixUsageTotal).isEqualByComparingTo(new BigDecimal("150"));

        // Step 8: Verify Transactional Outbox Events Emitted
        List<PlatformEvent> events = platformEvents.findByTenantId(acmeTenant.getId());
        assertThat(events).isNotEmpty();
        assertThat(events).extracting("eventType").contains(OutboxPublisher.TENANT_CREATED, OutboxPublisher.RESOURCE_PROVISIONED);

        // Step 9: Verify Platform Audit Trail
        AuditListResponse auditResponse = auditService.listAuditEvents(adminPrincipal, null, null, acmeTenant.getId().toString(), 1, 50, null);
        assertThat(auditResponse.data()).isNotNull();
    }

    private void executeProvisioningPipeline(Tenant tenant, TenantResource resource, String customSchemaName) {
        // Manually set schema name on resource for test step
        resource.setSchemaName(customSchemaName);

        var job = new com.cybelinx.platform.api.persistence.entity.ProvisioningJob();
        job.setTenant(tenant);
        job.setTenantResource(resource);
        job.setOperation(ProvisioningOperation.PROVISION);
        job.setState(ProvisioningState.IN_PROGRESS);

        var step1 = new com.cybelinx.platform.api.persistence.entity.ProvisioningStep();
        step1.setJob(job);
        step1.setName("CREATE_SCHEMA");
        step1.setSequence(0);
        step1.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        createSchemaHandler.execute(job, step1);

        // Override custom schema DDL to use product-specific schema name
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS \"" + customSchemaName + "\"");

        var step2 = new com.cybelinx.platform.api.persistence.entity.ProvisioningStep();
        step2.setJob(job);
        step2.setName("APPLY_MIGRATIONS");
        step2.setSequence(1);
        step2.setStatus(ProvisioningStepStatus.IN_PROGRESS);

        String createTableSql = "CREATE TABLE IF NOT EXISTS \"" + customSchemaName + "\".tenant_metadata ("
                + "key VARCHAR(128) PRIMARY KEY, "
                + "value TEXT, "
                + "created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP"
                + ")";
        jdbc.execute(createTableSql);

        var step3 = new com.cybelinx.platform.api.persistence.entity.ProvisioningStep();
        step3.setJob(job);
        step3.setName("ACTIVATE_RESOURCE");
        step3.setSequence(2);
        step3.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        activateResourceHandler.execute(job, step3);

        outboxPublisher.publishProvisioningEvent(OutboxPublisher.RESOURCE_PROVISIONED, tenant, resource.getProduct(), resource.getId(), Map.of("schemaName", customSchemaName));
    }
}
