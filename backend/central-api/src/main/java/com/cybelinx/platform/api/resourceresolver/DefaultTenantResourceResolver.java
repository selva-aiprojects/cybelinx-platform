package com.cybelinx.platform.api.resourceresolver;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.entity.Database;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Default resolver backed by the tenant resource registry. */
@Service
public class DefaultTenantResourceResolver implements TenantResourceResolver {

    private final TenantResourceRepository tenantResources;

    public DefaultTenantResourceResolver(TenantResourceRepository tenantResources) {
        this.tenantResources = tenantResources;
    }

    @Override
    @Transactional(readOnly = true)
    public ResolvedTenantResource resolve(UUID tenantId, UUID productId, Environment environment) {
        List<TenantResource> candidates = tenantResources.resolveFor(tenantId, productId, environment);

        TenantResource active = candidates.stream()
                .filter(resource -> resource.getStatus() == TenantResourceStatus.ACTIVE)
                .findFirst()
                .orElse(null);

        if (active != null) {
            return toResolved(active);
        }

        boolean onlyRetired = candidates.stream()
                .allMatch(resource -> resource.getStatus() == TenantResourceStatus.RETIRED);
        if (candidates.isEmpty() || onlyRetired) {
            throw new ApiError(
                    ErrorCode.RESOURCE_NOT_FOUND,
                    "No resource is registered for product \"" + productId + "\" in tenant \"" + tenantId
                            + "\" for environment \"" + environment + "\"",
                    Map.of(
                            "tenantId", tenantId.toString(),
                            "productId", productId.toString(),
                            "environment", environment.name()));
        }

        TenantResource pending = candidates.get(0);
        throw new ApiError(
                ErrorCode.RESOURCE_NOT_READY,
                "Resource for product \"" + productId + "\" in tenant \"" + tenantId + "\" is not ready "
                        + "(status \"" + pending.getStatus() + "\", provisioning \"" + pending.getProvisioningState() + "\")",
                Map.of(
                        "tenantId", tenantId.toString(),
                        "productId", productId.toString(),
                        "environment", environment.name(),
                        "status", pending.getStatus().name(),
                        "provisioningState", pending.getProvisioningState().name()));
    }

    private static ResolvedTenantResource toResolved(TenantResource resource) {
        Database database = resource.getDatabase();
        return new ResolvedTenantResource(
                resource.getTenant().getId(),
                resource.getProduct().getId(),
                resource.getId(),
                resource.getResource().getResourceTypeCode(),
                resource.getIsolationMode().name(),
                database != null ? database.getName() : null,
                database != null ? database.getEndpoint() : null,
                database != null ? database.getPort() : null,
                resource.getSchemaName(),
                resource.getRegion() != null ? resource.getRegion().getRegionCode() : null,
                resource.getCredentialReference());
    }
}