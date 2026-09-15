package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantIdpConfig;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for {@code tenant_idp_configs}. */
public interface TenantIdpConfigRepository extends JpaRepository<TenantIdpConfig, UUID> {

    Optional<TenantIdpConfig> findByTenant_Id(UUID tenantId);

    Optional<TenantIdpConfig> findByIssuer(String issuer);
}
