package com.cybelinx.platform.api.persistence.entity;

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
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Table {@code product_repository_customers} — per-customer overrides for the product repository
 * (tenant schema / database / contact) surfaced by the Product Repository screen.
 */
@Entity
@Table(
        name = "product_repository_customers",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"product_id", "tenant_id"},
                name = "product_repository_customers_product_tenant_key"))
public class ProductRepositoryCustomer extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "tenant_schema", length = 128)
    private String tenantSchema;

    @Column(name = "database_name", length = 128)
    private String databaseName;

    @Column(name = "contact_person", length = 200)
    private String contactPerson;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public String getTenantSchema() {
        return tenantSchema;
    }

    public void setTenantSchema(String tenantSchema) {
        this.tenantSchema = tenantSchema;
    }

    public String getDatabaseName() {
        return databaseName;
    }

    public void setDatabaseName(String databaseName) {
        this.databaseName = databaseName;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }
}