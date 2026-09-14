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
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

/** Table {@code tenant_mappings} — maps external product tenant identifiers to Cybelinx Tenant UUIDs. */
@Entity
@Table(name = "tenant_mappings")
public class TenantMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "product_code", nullable = false, length = 64)
    private String productCode;

    @Column(name = "external_tenant_id", nullable = false, length = 128)
    private String externalTenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cybelinx_tenant_id", nullable = false)
    private Tenant cybelinxTenant;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getExternalTenantId() {
        return externalTenantId;
    }

    public void setExternalTenantId(String externalTenantId) {
        this.externalTenantId = externalTenantId;
    }

    public Tenant getCybelinxTenant() {
        return cybelinxTenant;
    }

    public void setCybelinxTenant(Tenant cybelinxTenant) {
        this.cybelinxTenant = cybelinxTenant;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
