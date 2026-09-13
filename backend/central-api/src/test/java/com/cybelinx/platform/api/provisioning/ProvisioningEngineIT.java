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
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.transaction.annotation.Transactional;

/** Cap-11 integration coverage for the provisioning engine (TRD §14/§15). */
@SpringBootTest
@Transactional
class ProvisioningEngineIT {

    @Autowired private ProvisioningEngine engine;
    @Autowired private ProvisioningJobRepository jobs;
    @Autowired private TenantRepository tenants;
    @Autowired private EntityManager entityManager;

    private Tenant tenant;

    @BeforeEach
    void seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Tenant created = new Tenant();
        created.setTenantCode("PRV_" + suffix);
        created.setName("Provisioning Tenant");
        created.setStatus(TenantStatus.ACTIVE);
        tenant = tenants.save(created);
        entityManager.flush();
    }

    @Test
    void claimThenAdvanceToSucceeded() {
        ProvisioningJob job = job("CREATE_SCHEMA", "VALIDATE");
        assertThat(job.getState()).isEqualTo(ProvisioningState.PENDING);

        ProvisioningJob claimed = engine.claimNextEligible();
        assertThat(claimed).isNotNull();
        assertThat(claimed.getId()).isEqualTo(job.getId());
        assertThat(claimed.getState()).isEqualTo(ProvisioningState.IN_PROGRESS);
        assertThat(claimed.getStartedAt()).isNotNull();

        ProvisioningJob mid = engine.advance(job.getId());
        assertThat(mid.getState()).isEqualTo(ProvisioningState.IN_PROGRESS);
        assertThat(mid.getSteps().get(0).getStatus()).isEqualTo(ProvisioningStepStatus.SUCCEEDED);
        assertThat(mid.getSteps().get(1).getStatus()).isEqualTo(ProvisioningStepStatus.PENDING);
        assertThat(mid.getProgress()).isEqualTo(50);

        ProvisioningJob done = engine.advance(job.getId());
        assertThat(done.getState()).isEqualTo(ProvisioningState.SUCCEEDED);
        assertThat(done.getProgress()).isEqualTo(100);
        assertThat(done.getFinishedAt()).isNotNull();
        assertThat(done.getSteps()).extracting("status")
                .containsOnly(ProvisioningStepStatus.SUCCEEDED);
        assertThat(engine.isTerminal(done)).isTrue();
    }

    @Test
    void unknownStepNameFailsJobAndRecordsError() {
        ProvisioningJob job = job("UNKNOWN_STEP");
        engine.claimNextEligible();
        ProvisioningJob failed = engine.advance(job.getId());

        assertThat(failed.getState()).isEqualTo(ProvisioningState.FAILED);
        assertThat(failed.getErrorCode()).isEqualTo("PROVISIONING_STEP_FAILED");
        assertThat(failed.getErrorMessage()).contains("UNKNOWN_STEP");
        assertThat(failed.getSteps().get(0).getStatus())
                .isEqualTo(ProvisioningStepStatus.FAILED);
        assertThat(failed.getSteps().get(0).getErrorMessage()).isNotNull();
        assertThat(engine.isTerminal(failed)).isTrue();
    }

    @Test
    void claimSkipsJobsAlreadyInProgress() {
        ProvisioningJob first = job("NOOP");
        ProvisioningJob second = job("CREATE_SCHEMA", "VALIDATE");
        engine.claimNextEligible();

        ProvisioningJob claimed = engine.claimNextEligible();
        assertThat(claimed).isNotNull();
        assertThat(claimed.getId()).isEqualTo(second.getId());
        assertThat(first.getSteps().get(0).getStatus())
                .isEqualTo(ProvisioningStepStatus.PENDING);
    }

    private ProvisioningJob job(String... stepNames) {
        ProvisioningJob job = new ProvisioningJob();
        job.setTenant(tenant);
        job.setTenantProduct(null);
        job.setTenantResource(null);
        job.setOperation(ProvisioningOperation.PROVISION);
        job.setState(ProvisioningState.PENDING);
        job.setQueuedAt(LocalDateTime.now(ZoneOffset.UTC));
        for (int i = 0; i < stepNames.length; i++) {
            ProvisioningStep step = new ProvisioningStep();
            step.setJob(job);
            step.setSequence(i);
            step.setName(stepNames[i]);
            step.setStatus(ProvisioningStepStatus.PENDING);
            step.setInput(Map.of("tenantId", tenant.getId().toString()));
            job.getSteps().add(step);
        }
        jobs.save(job);
        entityManager.flush();
        return job;
    }

    @TestConfiguration
    static class HandlerTestConfiguration {

        @Bean
        ProvisioningStepHandler createSchemaHandler() {
            return new ProvisioningStepHandler() {
                @Override
                public String supportedStepName() {
                    return "CREATE_SCHEMA";
                }

                @Override
                public void execute(ProvisioningJob job, ProvisioningStep step) {
                    step.setOutput(Map.of("schemaName", "tenant_" + job.getTenant().getId()));
                }
            };
        }

        @Bean
        ProvisioningStepHandler validateHandler() {
            return new ProvisioningStepHandler() {
                @Override
                public String supportedStepName() {
                    return "VALIDATE";
                }

                @Override
                public void execute(ProvisioningJob job, ProvisioningStep step) {
                    step.setOutput(Map.of("ok", true));
                }
            };
        }

        @Bean
        ProvisioningStepHandler noopHandler() {
            return new ProvisioningStepHandler() {
                @Override
                public String supportedStepName() {
                    return "NOOP";
                }

                @Override
                public void execute(ProvisioningJob job, ProvisioningStep step) {
                    step.setOutput(Map.of("noop", true));
                }
            };
        }
    }
}