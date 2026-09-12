package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Resource;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code resource} (catalog) Prisma queries. */
public interface ResourceCatalogRepository extends JpaRepository<Resource, UUID> {

    Optional<Resource> findByResourceTypeCode(String resourceTypeCode);
}