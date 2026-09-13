package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Capability 11 provisioning-engine REST surface (TRD §14 / §15). */
@RestController
@RequestMapping("/tenants/{tenantId}/provisioning")
public class ProvisioningEngineController {

    private final ProvisioningJobsService provisioning;

    public ProvisioningEngineController(ProvisioningJobsService provisioning) {
        this.provisioning = provisioning;
    }

    @GetMapping("/jobs")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public List<ProvisioningJobPayload> listJobs(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return provisioning.listJobs(principal, tenantId);
    }

    @GetMapping("/jobs/{jobId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public ProvisioningJobPayload getJob(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID jobId) {
        return provisioning.getJob(principal, tenantId, jobId);
    }

    @PostMapping("/jobs/{jobId}/advance")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public ProvisioningJobPayload advance(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "false") boolean claim) {
        ProvisioningJob job = claim ? provisioning.claimAndAdvance(principal, tenantId, jobId)
                : provisioning.advance(principal, tenantId, jobId);
        return ProvisioningJobPayload.from(job);
    }
}