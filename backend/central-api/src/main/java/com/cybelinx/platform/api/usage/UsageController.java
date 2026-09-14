package com.cybelinx.platform.api.usage;

import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.usage.UsageViews.IngestResponse;
import com.cybelinx.platform.api.usage.UsageViews.IngestUsageRequest;
import com.cybelinx.platform.api.usage.UsageViews.UsageListResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Usage / metering REST surface under {@code /tenants/{tenantId}/usage}. */
@RestController
@RequestMapping("/tenants/{tenantId}/usage")
public class UsageController {

    private final UsageService usageService;

    public UsageController(UsageService usageService) {
        this.usageService = usageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public IngestResponse ingestUsage(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @Valid @RequestBody IngestUsageRequest request) {
        return usageService.ingestUsage(principal, tenantId, request);
    }

    @GetMapping
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_READ)
    public UsageListResponse listUsage(
            @CurrentPrincipal AuthPrincipal principal,
            @PathVariable UUID tenantId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return usageService.listUsage(
                principal, tenantId, eventType, from, to,
                Math.max(1, page), Math.min(200, Math.max(1, limit)));
    }
}
