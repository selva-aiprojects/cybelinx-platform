package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Security Filter establishing thread-local tenant boundary for incoming API requests.
 * Extracts X-Tenant-ID or X-External-Tenant-ID header and sets {@link TenantContext}.
 */
@Component
@Order(100)
public class TenantSecurityFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(TenantSecurityFilter.class);

    public static final String HEADER_TENANT_ID = "X-Tenant-ID";
    public static final String HEADER_EXTERNAL_TENANT_ID = "X-External-Tenant-ID";

    private final TenantRepository tenantRepository;

    public TenantSecurityFilter(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            String tenantHeader = request.getHeader(HEADER_TENANT_ID);
            if (tenantHeader == null || tenantHeader.isBlank()) {
                tenantHeader = request.getHeader(HEADER_EXTERNAL_TENANT_ID);
            }

            if (tenantHeader != null && !tenantHeader.isBlank()) {
                resolveAndSetContext(tenantHeader.trim());
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private void resolveAndSetContext(String headerValue) {
        try {
            UUID tenantId = UUID.fromString(headerValue);
            Optional<Tenant> tenantOpt = tenantRepository.findById(tenantId);
            if (tenantOpt.isPresent()) {
                Tenant tenant = tenantOpt.get();
                TenantContext.set(tenant.getId(), tenant.getTenantCode(), "SCHEMA_PER_TENANT");
                LOG.trace("TenantContext bound to Tenant ID: {}, Code: {}", tenant.getId(), tenant.getTenantCode());
                return;
            }
        } catch (IllegalArgumentException ignored) {
            // Header is a tenant code instead of UUID
        }

        Optional<Tenant> tenantOpt = tenantRepository.findByTenantCode(headerValue.toUpperCase());
        tenantOpt.ifPresent(tenant -> {
            TenantContext.set(tenant.getId(), tenant.getTenantCode(), "SCHEMA_PER_TENANT");
            LOG.trace("TenantContext bound to Tenant Code: {}", tenant.getTenantCode());
        });
    }
}
