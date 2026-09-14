package com.cybelinx.platform.api.tenants;

import com.cybelinx.platform.api.persistence.TenantMappingRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantMapping;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service managing product external tenant ID mappings to Cybelinx Tenant UUIDs. */
@Service
public class TenantMappingService {

    private final TenantMappingRepository tenantMappingRepository;
    private final TenantRepository tenantRepository;

    public TenantMappingService(TenantMappingRepository tenantMappingRepository, TenantRepository tenantRepository) {
        this.tenantMappingRepository = tenantMappingRepository;
        this.tenantRepository = tenantRepository;
    }

    @Transactional
    public TenantMapping createMapping(String productCode, String externalTenantId, UUID cybelinxTenantId) {
        Tenant tenant = tenantRepository.findById(cybelinxTenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + cybelinxTenantId));

        TenantMapping mapping = new TenantMapping();
        mapping.setProductCode(productCode);
        mapping.setExternalTenantId(externalTenantId);
        mapping.setCybelinxTenant(tenant);
        return tenantMappingRepository.save(mapping);
    }

    @Transactional(readOnly = true)
    public Optional<Tenant> resolveCybelinxTenant(String productCode, String externalTenantId) {
        return tenantMappingRepository.findByProductCodeAndExternalTenantId(productCode, externalTenantId)
                .map(TenantMapping::getCybelinxTenant);
    }
}
