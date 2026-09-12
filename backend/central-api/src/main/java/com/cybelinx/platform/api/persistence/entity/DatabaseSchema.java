package com.cybelinx.platform.api.persistence.entity;

import com.cybelinx.platform.api.domain.DatabaseStatus;
import com.cybelinx.platform.api.domain.Environment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Table {@code database_schemas} — schema-per-tenant workspaces within a managed database. */
@Entity
@Table(
        name = "database_schemas",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"database_id", "schema_name"},
                name = "database_schemas_database_name_unique"))
public class DatabaseSchema extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "database_id", nullable = false)
    private Database database;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "schema_name", nullable = false, length = 128)
    private String schemaName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "environment")
    private Environment environment;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private DatabaseStatus status = DatabaseStatus.PROVISIONING;

    @Column(name = "migration_version", length = 32)
    private String migrationVersion;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Database getDatabase() {
        return database;
    }

    public void setDatabase(Database database) {
        this.database = database;
    }

    public Region getRegion() {
        return region;
    }

    public void setRegion(Region region) {
        this.region = region;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public DatabaseStatus getStatus() {
        return status;
    }

    public void setStatus(DatabaseStatus status) {
        this.status = status;
    }

    public String getMigrationVersion() {
        return migrationVersion;
    }

    public void setMigrationVersion(String migrationVersion) {
        this.migrationVersion = migrationVersion;
    }
}