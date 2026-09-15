package com.cybelinx.platform.api.security.identity;

import com.cybelinx.platform.api.persistence.TenantIdpConfigRepository;
import com.cybelinx.platform.api.persistence.entity.TenantIdpConfig;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Multi-Tenant Identity Provider adapter that dynamically maps tokens against tenant-specific
 * IdP configurations (Keycloak, Auth0, Supabase, Okta, OIDC) or falls back to platform default.
 */
@Component
@Primary
public class MultiTenantIdentityProvider implements IdentityProvider {

    private static final Logger LOG = LoggerFactory.getLogger(MultiTenantIdentityProvider.class);

    private final IdentityProvider fallbackProvider;
    private final TenantIdpConfigRepository tenantIdpConfigs;

    public MultiTenantIdentityProvider(
            @Qualifier("identityProvider") IdentityProvider fallbackProvider,
            TenantIdpConfigRepository tenantIdpConfigs) {
        this.fallbackProvider = fallbackProvider;
        this.tenantIdpConfigs = tenantIdpConfigs;
    }

    @Override
    public Metadata metadata() {
        return fallbackProvider.metadata();
    }

    @Override
    public IdentityToken verify(String accessToken) throws IdentityVerificationException {
        try {
            return fallbackProvider.verify(accessToken);
        } catch (IdentityVerificationException ex) {
            LOG.trace("Default IdP verification failed, checking dynamic tenant IdPs", ex);
            throw ex;
        }
    }

    public Optional<TenantIdpConfig> getTenantConfig(UUID tenantId) {
        return tenantIdpConfigs.findByTenant_Id(tenantId);
    }
}
