package com.cybelinx.platform.api.provisioning;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.domain.ProvisioningOperation;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.ProvisioningStepStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.ProvisioningJobRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Concurrency integration tests for provisioning engine and job claiming (Capability 30). */
@SpringBootTest
class ConcurrentProvisioningIT {

    @Autowired private ProvisioningEngine engine;
    @Autowired private ProvisioningJobRepository jobs;
    @Autowired private TenantRepository tenants;

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Tenant created = new Tenant();
        created.setTenantCode("CONC_" + suffix);
        created.setName("Concurrent Test Corp");
        created.setStatus(TenantStatus.ACTIVE);
        tenant = tenants.save(created);
    }

    @Test
    void concurrentClaim_claimsOnlyOneJobPerWorker() throws InterruptedException {
        // Create 5 pending jobs
        for (int i = 0; i < 5; i++) {
            createJob("CREATE_SCHEMA");
        }

        int threadCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger claimedCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String workerId = "worker-thread-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    ProvisioningJob claimed = engine.claimNextEligible();
                    if (claimed != null) {
                        claimedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Assert all 5 jobs were claimed without duplicate claims
        assertThat(claimedCount.get()).isEqualTo(5);
    }

    private ProvisioningJob createJob(String stepName) {
        ProvisioningJob job = new ProvisioningJob();
        job.setTenant(tenant);
        job.setOperation(ProvisioningOperation.PROVISION);
        job.setState(ProvisioningState.PENDING);
        job.setQueuedAt(LocalDateTime.now(ZoneOffset.UTC));

        ProvisioningStep step = new ProvisioningStep();
        step.setJob(job);
        step.setSequence(0);
        step.setName(stepName);
        step.setStatus(ProvisioningStepStatus.PENDING);
        step.setInput(Map.of("tenantId", tenant.getId().toString()));
        job.getSteps().add(step);

        return jobs.save(job);
    }
}
