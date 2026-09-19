package com.cybelinx.platform.api.persistence.entity;

import com.cybelinx.platform.api.domain.ProductCategory;
import com.cybelinx.platform.api.domain.ProductStatus;
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
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Table {@code products} — platform-registered product registry. */
@Entity
@Table(name = "products")
public class Product extends BaseTimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "product_code", nullable = false, unique = true, length = 64)
    private String productCode;

    @Column(name = "portfolio_code", length = 64)
    private String portfolioCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "base_url", length = 256)
    private String baseUrl;

    @Column(name = "domain", length = 256)
    private String domain;

    @Column(name = "database_location", length = 512)
    private String databaseLocation;

    @Column(name = "database_connection_string", length = 512)
    private String databaseConnectionString;

    @Column(name = "configuration_location", length = 512)
    private String configurationLocation;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "product_category", nullable = false)
    private ProductCategory productCategory = ProductCategory.ENTERPRISE_OPERATIONS;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private ProductStatus status = ProductStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id", unique = true)
    private ProductVersion currentVersion;

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

    public String getPortfolioCode() {
        return portfolioCode;
    }

    public void setPortfolioCode(String portfolioCode) {
        this.portfolioCode = portfolioCode;
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

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getDatabaseLocation() {
        return databaseLocation;
    }

    public void setDatabaseLocation(String databaseLocation) {
        this.databaseLocation = databaseLocation;
    }

    public String getDatabaseConnectionString() {
        return databaseConnectionString;
    }

    public void setDatabaseConnectionString(String databaseConnectionString) {
        this.databaseConnectionString = databaseConnectionString;
    }

    public String getConfigurationLocation() {
        return configurationLocation;
    }

    public void setConfigurationLocation(String configurationLocation) {
        this.configurationLocation = configurationLocation;
    }

    public ProductCategory getProductCategory() {
        return productCategory;
    }

    public void setProductCategory(ProductCategory productCategory) {
        this.productCategory = productCategory;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }

    public ProductVersion getCurrentVersion() {
        return currentVersion;
    }

    public void setCurrentVersion(ProductVersion currentVersion) {
        this.currentVersion = currentVersion;
    }
}