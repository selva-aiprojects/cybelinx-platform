package com.cybelinx.platform.api.persistence.entity;

import com.cybelinx.platform.api.domain.PlanStatus;
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
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Table {@code plans} — purchasable plans / SKUs per product. */
@Entity
@Table(
        name = "plans",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"product_id", "plan_code"},
                name = "plans_product_code_unique"))
public class Plan extends BaseTimestampedEntity {

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

    @Column(name = "plan_code", nullable = false, length = 64)
    private String planCode;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description")
    private String description;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private PlanStatus status = PlanStatus.DRAFT;

    @Column(name = "trial_days")
    private Integer trialDays;

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

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public PlanStatus getStatus() {
        return status;
    }

    public void setStatus(PlanStatus status) {
        this.status = status;
    }

    public Integer getTrialDays() {
        return trialDays;
    }

    public void setTrialDays(Integer trialDays) {
        this.trialDays = trialDays;
    }
}