package com.cybelinx.platform.api.persistence.entity;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
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

/** Table {@code tenant_resources} — the tenant resource registry. */
@Entity
@Table(
        name = "tenant_resources",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"tenant_id", "product_id", "environment", "resource_id"},
                name = "tenant_resources_tenant_product_env_resource_unique"))
public class TenantResource extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_product_id")
    private TenantProduct tenantProduct;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "isolation_mode", nullable = false)
    private IsolationMode isolationMode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "database_id")
    private Database database;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id")
    private DatabaseSchema schema;

    @Column(name = "schema_name", length = 128)
    private String schemaName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "environment", nullable = false)
    private Environment environment = Environment.DEVELOPMENT;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private TenantResourceStatus status = TenantResourceStatus.PENDING;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "provisioning_state", nullable = false)
    private ProvisioningState provisioningState = ProvisioningState.PENDING;

    @Column(name = "migration_version", length = 32)
    private String migrationVersion;

    @Column(name = "credential_reference", length = 512)
    private String credentialReference;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public TenantProduct getTenantProduct() {
        return tenantProduct;
    }

    public void setTenantProduct(TenantProduct tenantProduct) {
        this.tenantProduct = tenantProduct;
    }

    public Resource getResource() {
        return resource;
    }

    public void setResource(Resource resource) {
        this.resource = resource;
    }

    public IsolationMode getIsolationMode() {
        return isolationMode;
    }

    public void setIsolationMode(IsolationMode isolationMode) {
        this.isolationMode = isolationMode;
    }

    public Database getDatabase() {
        return database;
    }

    public void setDatabase(Database database) {
        this.database = database;
    }

    public DatabaseSchema getSchema() {
        return schema;
    }

    public void setSchema(DatabaseSchema schema) {
        this.schema = schema;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public Region getRegion() {
        return region;
    }

    public void setRegion(Region region) {
        this.region = region;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public TenantResourceStatus getStatus() {
        return status;
    }

    public void setStatus(TenantResourceStatus status) {
        this.status = status;
    }

    public ProvisioningState getProvisioningState() {
        return provisioningState;
    }

    public void setProvisioningState(ProvisioningState provisioningState) {
        this.provisioningState = provisioningState;
    }

    public String getMigrationVersion() {
        return migrationVersion;
    }

    public void setMigrationVersion(String migrationVersion) {
        this.migrationVersion = migrationVersion;
    }

    public String getCredentialReference() {
        return credentialReference;
    }

    public void setCredentialReference(String credentialReference) {
        this.credentialReference = credentialReference;
    }
}