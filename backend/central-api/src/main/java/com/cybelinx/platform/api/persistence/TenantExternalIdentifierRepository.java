package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for {@code tenant_external_identifiers} — cross-product tenant ID mapping. */
public interface TenantExternalIdentifierRepository
        extends JpaRepository<TenantExternalIdentifier, UUID> {

    List<TenantExternalIdentifier> findByTenant_Id(UUID tenantId);

    boolean existsByTenant_IdAndProduct_IdAndExternalId(
            UUID tenantId, UUID productId, String externalId);
}
