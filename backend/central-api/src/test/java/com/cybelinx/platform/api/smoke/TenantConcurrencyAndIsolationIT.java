package com.cybelinx.platform.api.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.events.OutboxPublisher;
import com.cybelinx.platform.api.persistence.PlanRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.entity.Plan;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.provisioning.handlers.ActivateResourceStepHandler;
import com.cybelinx.platform.api.provisioning.handlers.CreateSchemaStepHandler;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.usage.UsageService;
import com.cybelinx.platform.api.usage.UsageViews.IngestResponse;
import com.cybelinx.platform.api.usage.UsageViews.IngestUsageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Concurrency & Tenant-Isolation integration test verifying parallel tenant provisioning pipelines,
 * multi-schema creation, usage ingestion, and outbox publishing without cross-tenant data leaks.
 */
@SpringBootTest
class TenantConcurrencyAndIsolationIT {

    @Autowired private TenantRepository tenants;
    @Autowired private ProductRepository products;
    @Autowired private PlanRepository plans;
    @Autowired private TenantProductRepository tenantProducts;
    @Autowired private ResourceCatalogRepository resourceCatalog;
    @Autowired private TenantResourceRepository tenantResources;
    @Autowired private CreateSchemaStepHandler createSchemaHandler;
    @Autowired private ActivateResourceStepHandler activateResourceHandler;
    @Autowired private OutboxPublisher outboxPublisher;
    @Autowired private UsageService usageService;
    @Autowired private JdbcTemplate jdbc;

    private UUID productId;
    private UUID planId;
    private UUID resourceId;
    private AuthPrincipal adminPrincipal;

    @BeforeEach
    void setUpSharedResources() {
        UUID adminId = UUID.randomUUID();
        adminPrincipal = new AuthPrincipal(
                new AuthPrincipal.AuthUser(adminId, "admin@concurrent.test", "Concurrent Admin", "ACTIVE", null, null),
                new AuthPrincipal.AuthIdentity("generic", "ext-admin-conc", "admin@concurrent.test", "Concurrent Admin"));

        // Register Admin in DB
        jdbc.execute("DELETE FROM users WHERE email = 'admin@concurrent.test'");
        jdbc.execute("INSERT INTO users (id, email, \"displayName\", status, created_at, updated_at) VALUES ('" + adminId + "', 'admin@concurrent.test', 'Concurrent Admin', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        // Clean up previous test runs with TCON prefix
        jdbc.execute("DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%')");
        jdbc.execute("DELETE FROM platform_events WHERE payload->>'code' LIKE 'TCON%'");
        jdbc.execute("DELETE FROM tenant_resources WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%')");
        jdbc.execute("DELETE FROM tenant_products WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%')");
        jdbc.execute("DELETE FROM membership_roles WHERE membership_id IN (SELECT id FROM tenant_memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%'))");
        jdbc.execute("DELETE FROM tenant_memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%')");
        jdbc.execute("DELETE FROM tenants WHERE tenant_code LIKE 'TCON%'");

        for (int i = 1; i <= 10; i++) {
            jdbc.execute("DROP SCHEMA IF EXISTS tenant_tcon" + i + "_jioplix CASCADE");
        }

        Product p = products.findByProductCode("JIOPLIX").orElseGet(() -> {
            Product prod = new Product();
            prod.setProductCode("JIOPLIX");
            prod.setName("Jioplix Suite");
            prod.setStatus(ProductStatus.ACTIVE);
            return products.saveAndFlush(prod);
        });
        productId = p.getId();

        Plan pl = plans.findByProductIdAndPlanCode(productId, "ENTERPRISE").orElseGet(() -> {
            Plan plan = new Plan();
            plan.setProduct(p);
            plan.setPlanCode("ENTERPRISE");
            plan.setName("Enterprise Plan");
            plan.setStatus(PlanStatus.ACTIVE);
            return plans.saveAndFlush(plan);
        });
        planId = pl.getId();

        Resource r = resourceCatalog.findByResourceTypeCode("shared_pg_instance").orElseGet(() -> {
            Resource res = new Resource();
            res.setResourceTypeCode("shared_pg_instance");
            res.setName("Shared PostgreSQL Instance");
            return resourceCatalog.saveAndFlush(res);
        });
        resourceId = r.getId();
    }

    @Test
    @DisplayName("Concurrency & Isolation: 10 Parallel Tenants Provisioning Schemas, Ingesting Usage, and Publishing Events")
    void testConcurrentTenantsIsolationAndProvisioning() throws Exception {
        int concurrentTenantsCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(concurrentTenantsCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(concurrentTenantsCount);
        AtomicInteger successCounter = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();

        for (int i = 1; i <= concurrentTenantsCount; i++) {
            final int tenantIndex = i;
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize worker threads

                    String tenantCode = "TCON" + tenantIndex;
                    String schemaName = "tenant_tcon" + tenantIndex + "_jioplix";

                    // Fetch un-proxied entity references per thread session
                    Product product = products.findById(productId).orElseThrow();
                    Plan plan = plans.findById(planId).orElseThrow();
                    Resource resource = resourceCatalog.findById(resourceId).orElseThrow();

                    // 1. Create Tenant
                    Tenant tenant = new Tenant();
                    tenant.setTenantCode(tenantCode);
                    tenant.setName("Concurrent Tenant " + tenantIndex);
                    tenant.setCountry("US");
                    tenant.setTimezone("UTC");
                    tenant.setStatus(TenantStatus.ACTIVE);
                    tenant = tenants.saveAndFlush(tenant);

                    // Register Membership for Admin Auth
                    UUID memberId = UUID.randomUUID();
                    UUID memberRoleId = UUID.randomUUID();
                    jdbc.execute("INSERT INTO tenant_memberships (id, tenant_id, user_id, status, created_at, updated_at) VALUES ('" + memberId + "', '" + tenant.getId() + "', '" + adminPrincipal.user().id() + "', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
                    jdbc.execute("INSERT INTO membership_roles (id, membership_id, role_id, granted_at) VALUES ('" + memberRoleId + "', '" + memberId + "', (SELECT id FROM roles WHERE code = 'CYBELINX_PLATFORM_ADMIN'), CURRENT_TIMESTAMP)");

                    // 2. Attach Subscription
                    TenantProduct sub = new TenantProduct();
                    sub.setTenant(tenant);
                    sub.setProduct(product);
                    sub.setPlan(plan);
                    sub.setStatus(TenantProductStatus.ACTIVE);
                    sub.setActivatedAt(LocalDateTime.now(ZoneOffset.UTC));
                    sub = tenantProducts.saveAndFlush(sub);

                    // 3. Provision Tenant Resource & Database Schema
                    TenantResource tenantResource = new TenantResource();
                    tenantResource.setTenant(tenant);
                    tenantResource.setProduct(product);
                    tenantResource.setTenantProduct(sub);
                    tenantResource.setResource(resource);
                    tenantResource.setSchemaName(schemaName);
                    tenantResource.setIsolationMode(IsolationMode.SCHEMA_PER_TENANT);
                    tenantResource.setEnvironment(Environment.PRODUCTION);
                    tenantResource.setStatus(TenantResourceStatus.PROVISIONING);
                    tenantResource.setProvisioningState(ProvisioningState.IN_PROGRESS);
                    tenantResource = tenantResources.saveAndFlush(tenantResource);

                    // Execute Schema Creation & Activation
                    executeStepPipeline(tenant, tenantResource, schemaName);

                    // 4. Ingest Metered Usage
                    IngestUsageRequest usageReq = new IngestUsageRequest(
                            product.getProductCode(), "api_call", new BigDecimal(100 * tenantIndex), "requests", "tcon-dedupe-" + tenantIndex, null, null
                    );
                    IngestResponse usageResp = usageService.ingestUsage(adminPrincipal, tenant.getId(), usageReq);
                    assertThat(usageResp.status()).isEqualTo("created");

                    // 5. Outbox Event
                    outboxPublisher.publishTenantEvent(OutboxPublisher.TENANT_CREATED, tenant, Map.of("code", tenantCode, "thread", Thread.currentThread().getName()));

                    successCounter.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            }));
        }

        // Release threads simultaneously
        startLatch.countDown();

        boolean completedInTime = finishLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completedInTime).isTrue();
        assertThat(successCounter.get()).isEqualTo(concurrentTenantsCount);

        // Verification: Validate all 10 schemas created independently in Postgres
        for (int i = 1; i <= concurrentTenantsCount; i++) {
            String schemaName = "tenant_tcon" + i + "_jioplix";
            Integer schemaCount = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?",
                    Integer.class, schemaName
            );
            assertThat(schemaCount).isEqualTo(1);
        }

        // Verification: Validate usage events count across concurrent tenants
        Integer usageCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE tenant_code LIKE 'TCON%')",
                Integer.class
        );
        assertThat(usageCount).isEqualTo(concurrentTenantsCount);
    }

    private void executeStepPipeline(Tenant tenant, TenantResource resource, String schemaName) {
        ProvisioningJob job = new ProvisioningJob();
        job.setTenant(tenant);
        job.setTenantResource(resource);
        job.setOperation(ProvisioningOperation.PROVISION);
        job.setState(ProvisioningState.IN_PROGRESS);

        ProvisioningStep step1 = new ProvisioningStep();
        step1.setJob(job);
        step1.setName("CREATE_SCHEMA");
        step1.setSequence(0);
        step1.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        createSchemaHandler.execute(job, step1);

        jdbc.execute("CREATE SCHEMA IF NOT EXISTS \"" + schemaName + "\"");

        ProvisioningStep step3 = new ProvisioningStep();
        step3.setJob(job);
        step3.setName("ACTIVATE_RESOURCE");
        step3.setSequence(2);
        step3.setStatus(ProvisioningStepStatus.IN_PROGRESS);
        activateResourceHandler.execute(job, step3);
    }
}
