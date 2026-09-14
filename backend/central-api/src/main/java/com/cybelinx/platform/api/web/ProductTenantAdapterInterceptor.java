package com.cybelinx.platform.api.web;

import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.tenants.TenantMappingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Spring Web Interceptor adapting incoming product requests containing X-External-Tenant-ID & X-Product-Code
 * headers into resolved Cybelinx Tenant context attributes.
 */
@Component
public class ProductTenantAdapterInterceptor implements HandlerInterceptor {

    public static final String RESOLVED_TENANT_ATTR = "cybelinx.resolved.tenantId";
    public static final String HEADER_EXTERNAL_TENANT_ID = "X-External-Tenant-ID";
    public static final String HEADER_PRODUCT_CODE = "X-Product-Code";

    private final TenantMappingService tenantMappingService;

    public ProductTenantAdapterInterceptor(TenantMappingService tenantMappingService) {
        this.tenantMappingService = tenantMappingService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String externalTenantId = request.getHeader(HEADER_EXTERNAL_TENANT_ID);
        String productCode = request.getHeader(HEADER_PRODUCT_CODE);

        if (externalTenantId != null && !externalTenantId.isBlank() && productCode != null && !productCode.isBlank()) {
            Optional<Tenant> resolvedTenant = tenantMappingService.resolveCybelinxTenant(productCode, externalTenantId);
            resolvedTenant.ifPresent(tenant -> request.setAttribute(RESOLVED_TENANT_ATTR, tenant.getId()));
        }
        return true;
    }
}
