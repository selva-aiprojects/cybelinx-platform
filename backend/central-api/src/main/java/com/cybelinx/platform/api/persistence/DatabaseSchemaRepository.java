package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.DatabaseSchema;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for database schemas. */
public interface DatabaseSchemaRepository extends JpaRepository<DatabaseSchema, UUID> {

    Optional<DatabaseSchema> findByDatabaseIdAndSchemaName(UUID databaseId, String schemaName);
}
