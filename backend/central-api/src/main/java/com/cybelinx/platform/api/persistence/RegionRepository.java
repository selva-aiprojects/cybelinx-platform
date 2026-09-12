package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Region;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code region} Prisma queries. */
public interface RegionRepository extends JpaRepository<Region, UUID> {

    Optional<Region> findByRegionCode(String regionCode);
}