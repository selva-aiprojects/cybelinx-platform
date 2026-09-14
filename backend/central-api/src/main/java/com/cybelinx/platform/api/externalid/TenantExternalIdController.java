package com.cybelinx.platform.api.externalid;

import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdActionResponse;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdListResponse;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdView;
import com.cybelinx.platform.api.externalid.ExternalIdViews.RegisterExternalIdRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Tenant external-ID mapping REST surface under {@code /tenants/{tenantId}/external-ids}. */
@RestController
@RequestMapping("/tenants/{tenantId}/external-ids")
public class TenantExternalIdController {

    private final TenantExternalIdService service;

    public TenantExternalIdController(TenantExternalIdService service) {
        this.service = service;
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public ExternalIdListResponse listExternalIds(
            @CurrentPrincipal AuthPrincipal principal, @PathVariable UUID tenantId) {
        return service.listExternalIds(principal, tenantId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public ExternalIdView registerExternalId(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody RegisterExternalIdRequest request) {
        return service.registerExternalId(principal, tenantId, request);
    }

    @DeleteMapping("/{mappingId}")
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public ExternalIdActionResponse removeExternalId(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @PathVariable UUID mappingId) {
        return service.removeExternalId(principal, tenantId, mappingId);
    }
}
