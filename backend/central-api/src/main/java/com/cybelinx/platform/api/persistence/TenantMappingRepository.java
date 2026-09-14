package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantMapping;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for {@link TenantMapping}. */
public interface TenantMappingRepository extends JpaRepository<TenantMapping, UUID> {

    Optional<TenantMapping> findByProductCodeAndExternalTenantId(String productCode, String externalTenantId);
}
