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

    @Column(name = "hosting_provider", length = 64)
    private String hostingProvider;

    @Column(name = "deployment_url", length = 512)
    private String deploymentUrl;

    @Column(name = "subdomain_pattern", length = 256)
    private String subdomainPattern;

    @Column(name = "health_endpoint", length = 256)
    private String healthEndpoint;

    @Column(name = "database_provider", length = 64)
    private String databaseProvider;

    @Column(name = "db_url_development", length = 512)
    private String dbUrlDevelopment;

    @Column(name = "db_url_staging", length = 512)
    private String dbUrlStaging;

    @Column(name = "db_url_production", length = 512)
    private String dbUrlProduction;

    @Column(name = "db_credentials_reference", length = 256)
    private String dbCredentialsReference;

    @Column(name = "default_isolation_mode", length = 64)
    private String defaultIsolationMode = "SCHEMA_PER_TENANT";

    @Column(name = "schema_prefix", length = 64)
    private String schemaPrefix;

    @Column(name = "ddl_template_path", length = 256)
    private String ddlTemplatePath;

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

    public String getHostingProvider() {
        return hostingProvider;
    }

    public void setHostingProvider(String hostingProvider) {
        this.hostingProvider = hostingProvider;
    }

    public String getDeploymentUrl() {
        return deploymentUrl;
    }

    public void setDeploymentUrl(String deploymentUrl) {
        this.deploymentUrl = deploymentUrl;
    }

    public String getSubdomainPattern() {
        return subdomainPattern;
    }

    public void setSubdomainPattern(String subdomainPattern) {
        this.subdomainPattern = subdomainPattern;
    }

    public String getHealthEndpoint() {
        return healthEndpoint;
    }

    public void setHealthEndpoint(String healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }

    public String getDatabaseProvider() {
        return databaseProvider;
    }

    public void setDatabaseProvider(String databaseProvider) {
        this.databaseProvider = databaseProvider;
    }

    public String getDbUrlDevelopment() {
        return dbUrlDevelopment;
    }

    public void setDbUrlDevelopment(String dbUrlDevelopment) {
        this.dbUrlDevelopment = dbUrlDevelopment;
    }

    public String getDbUrlStaging() {
        return dbUrlStaging;
    }

    public void setDbUrlStaging(String dbUrlStaging) {
        this.dbUrlStaging = dbUrlStaging;
    }

    public String getDbUrlProduction() {
        return dbUrlProduction;
    }

    public void setDbUrlProduction(String dbUrlProduction) {
        this.dbUrlProduction = dbUrlProduction;
    }

    public String getDbCredentialsReference() {
        return dbCredentialsReference;
    }

    public void setDbCredentialsReference(String dbCredentialsReference) {
        this.dbCredentialsReference = dbCredentialsReference;
    }

    public String getDefaultIsolationMode() {
        return defaultIsolationMode;
    }

    public void setDefaultIsolationMode(String defaultIsolationMode) {
        this.defaultIsolationMode = defaultIsolationMode;
    }

    public String getSchemaPrefix() {
        return schemaPrefix;
    }

    public void setSchemaPrefix(String schemaPrefix) {
        this.schemaPrefix = schemaPrefix;
    }

    public String getDdlTemplatePath() {
        return ddlTemplatePath;
    }

    public void setDdlTemplatePath(String ddlTemplatePath) {
        this.ddlTemplatePath = ddlTemplatePath;
    }
}