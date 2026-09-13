package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantResource;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code tenantResource} Prisma queries. */
public interface TenantResourceRepository extends JpaRepository<TenantResource, UUID> {

    @Query(
            "select tr from TenantResource tr join fetch tr.resource join fetch tr.product "
                    + "where tr.tenant.id = :tenantId order by tr.createdAt asc")
    List<TenantResource> listByTenantId(@Param("tenantId") UUID tenantId);

    @Query(
            "select tr from TenantResource tr join fetch tr.resource join fetch tr.product "
                    + "where tr.id = :id and tr.tenant.id = :tenantId")
    Optional<TenantResource> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndProductIdAndEnvironmentAndResourceId(
            UUID tenantId, UUID productId, com.cybelinx.platform.api.domain.Environment environment, UUID resourceId);

    @Query(
            "select tr from TenantResource tr join fetch tr.resource join fetch tr.product "
                    + "left join fetch tr.database left join fetch tr.schema left join fetch tr.region "
                    + "where tr.tenant.id = :tenantId and tr.product.id = :productId "
                    + "and tr.environment = :environment order by tr.createdAt desc")
    List<TenantResource> resolveFor(
            @Param("tenantId") UUID tenantId,
            @Param("productId") UUID productId,
            @Param("environment") com.cybelinx.platform.api.domain.Environment environment);
}