package com.cybelinx.platform.api.persistence.entity;

import com.cybelinx.platform.api.domain.TenantProductStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Table {@code tenant_products} — a tenant's subscription to a product. */
@Entity
@Table(
        name = "tenant_products",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"tenant_id", "product_id"},
                name = "tenant_products_tenant_product_unique"))
public class TenantProduct extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private TenantProductStatus status = TenantProductStatus.PROVISIONING;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

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

    public Plan getPlan() {
        return plan;
    }

    public void setPlan(Plan plan) {
        this.plan = plan;
    }

    public TenantProductStatus getStatus() {
        return status;
    }

    public void setStatus(TenantProductStatus status) {
        this.status = status;
    }

    public LocalDateTime getActivatedAt() {
        return activatedAt;
    }

    public void setActivatedAt(LocalDateTime activatedAt) {
        this.activatedAt = activatedAt;
    }
}