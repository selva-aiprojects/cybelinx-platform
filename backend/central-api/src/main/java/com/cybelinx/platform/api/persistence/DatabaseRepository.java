package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Database;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for managed databases. */
public interface DatabaseRepository extends JpaRepository<Database, UUID> {

    Optional<Database> findByName(String name);

    Optional<Database> findByRegionIdAndName(UUID regionId, String name);
}
