package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantResource;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code tenantResource} Prisma queries. */
public interface TenantResourceRepository extends JpaRepository<TenantResource, UUID> {

    @Query(
            "select tr from TenantResource tr join fetch tr.resource "
                    + "where tr.tenant.id = :tenantId order by tr.createdAt asc")
    List<TenantResource> listByTenantId(@Param("tenantId") UUID tenantId);
}