package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.ProvisioningStep;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reader for ordered steps of a single provisioning job (TRD §15 step model). */
public interface ProvisioningStepRepository extends JpaRepository<ProvisioningStep, UUID> {

    List<ProvisioningStep> findByJobIdOrderBySequenceAsc(UUID jobId);
}
