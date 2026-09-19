package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code tenantProduct} Prisma queries. */
public interface TenantProductRepository extends JpaRepository<TenantProduct, UUID> {

    @Query(
            "select tp from TenantProduct tp join fetch tp.product join fetch tp.plan "
                    + "where tp.tenant.id = :tenantId order by tp.createdAt asc")
    List<TenantProduct> listByTenantId(@Param("tenantId") UUID tenantId);

    @Query(
            "select tp from TenantProduct tp join fetch tp.product join fetch tp.plan join fetch tp.tenant "
                    + "order by tp.createdAt asc")
    List<TenantProduct> listAllWithDetails();

    @Query(
            "select tp from TenantProduct tp join fetch tp.product join fetch tp.plan join fetch tp.tenant "
                    + "where tp.product.id = :productId order by tp.createdAt asc")
    List<TenantProduct> listByProductId(@Param("productId") UUID productId);

    @Query(
            "select tp from TenantProduct tp join fetch tp.product join fetch tp.plan join fetch tp.tenant "
                    + "where tp.id = :id")
    Optional<TenantProduct> findByIdWithDetails(@Param("id") UUID id);

    Optional<TenantProduct> findByTenantIdAndProductId(UUID tenantId, UUID productId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update TenantProduct tp set tp.status = :status where tp.tenant.id = :tenantId")
    int updateStatusByTenantId(@Param("tenantId") UUID tenantId, @Param("status") TenantProductStatus status);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update TenantProduct tp set tp.status = :status, tp.activatedAt = :activatedAt where tp.id = :id")
    int updateStatusAndActivatedAt(
            @Param("id") UUID id, @Param("status") TenantProductStatus status, @Param("activatedAt") LocalDateTime activatedAt);
}