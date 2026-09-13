package com.cybelinx.platform.api.provisioning;

import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.ProvisioningJob;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tenant-guarded facade over the Capability 11 provisioning engine. */
@Service
public class ProvisioningJobsService {

    private final ProvisioningEngine engine;
    private final TenantRepository tenants;
    private final AuthorizationService authorization;

    public ProvisioningJobsService(
            ProvisioningEngine engine, TenantRepository tenants, AuthorizationService authorization) {
        this.engine = engine;
        this.tenants = tenants;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public List<ProvisioningJobPayload> listJobs(AuthPrincipal principal, UUID tenantId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        return engine.findByTenantId(tenantId).stream()
                .map(ProvisioningJobPayload::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProvisioningJobPayload getJob(AuthPrincipal principal, UUID tenantId, UUID jobId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        return ProvisioningJobPayload.from(requireJob(tenantId, jobId));
    }

    @Transactional
    public ProvisioningJob claimAndAdvance(AuthPrincipal principal, UUID tenantId, UUID jobId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        ProvisioningJob claimed = engine.claimNextEligible();
        if (claimed == null || !claimed.getId().equals(jobId)) {
            throw new ApiError(
                    ErrorCode.PROVISIONING_JOB_NOT_CLAIMABLE,
                    "Provisioning job \"" + jobId + "\" is not the next eligible job",
                    Map.of("tenantId", tenantId.toString(), "jobId", jobId.toString()));
        }
        return engine.advance(jobId);
    }

    @Transactional
    public ProvisioningJob advance(AuthPrincipal principal, UUID tenantId, UUID jobId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        requireJob(tenantId, jobId);
        return engine.advance(jobId);
    }

    private ProvisioningJob requireJob(UUID tenantId, UUID jobId) {
        return engine.findByTenantId(tenantId).stream()
                .filter(candidate -> candidate.getId().equals(jobId))
                .findFirst()
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PROVISIONING_JOB_NOT_FOUND,
                        "Provisioning job \"" + jobId + "\" does not exist for tenant \"" + tenantId + "\"",
                        Map.of("tenantId", tenantId.toString(), "jobId", jobId.toString())));
    }

    private Tenant requireTenant(UUID tenantId) {
        return tenants.findById(tenantId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_NOT_FOUND,
                        "Tenant \"" + tenantId + "\" does not exist",
                        Map.of("tenantId", tenantId.toString())));
    }

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) {
            return;
        }
        var entry = access.stream().filter(e -> e.tenantId().equals(tenantId)).findFirst().orElse(null);
        if (entry == null || !entry.permissions().contains(permission)) {
            throw new ApiError(
                    ErrorCode.TENANT_ACCESS_DENIED,
                    "You do not have \"" + permission + "\" access on tenant \"" + tenantId + "\"",
                    Map.of("tenantId", tenantId.toString(), "permission", permission));
        }
    }
}