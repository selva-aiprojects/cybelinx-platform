package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.ProductVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code productVersion} Prisma queries. */
public interface ProductVersionRepository extends JpaRepository<ProductVersion, UUID> {

    Optional<ProductVersion> findByProductIdAndVersion(UUID productId, String version);

    Optional<ProductVersion> findByIdAndProductId(UUID id, UUID productId);

    List<ProductVersion> findByProductIdAndIsCurrentTrue(UUID productId);

    List<ProductVersion> findByProductIdOrderByCreatedAtAsc(UUID productId);
}