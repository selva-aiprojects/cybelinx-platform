package com.cybelinx.platform.api.productrepository.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload to register a new product with physical topology in the Product Repository.
 */
public class CreateProductRepositoryRequest {

    @NotBlank(message = "Product code is required")
    @Pattern(regexp = "^[A-Z0-9_]{2,64}$", message = "Product code must be uppercase alphanumeric and underscore (2-64 chars)")
    private String productCode;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;
    private String productCategory;
    private String status;

    // Cloud Hosting & Web Domains
    private String domain;
    private String subdomainPattern;
    private String hostingProvider;
    private String deploymentUrl;
    private String healthEndpoint;

    // Multi-Environment Database Topology
    private String databaseProvider;
    private String dbUrlDevelopment;
    private String dbUrlStaging;
    private String dbUrlProduction;
    private String dbCredentialsReference;

    // Tenant Isolation & Provisioning
    private String defaultIsolationMode;
    private String schemaPrefix;
    private String ddlTemplatePath;

    // Configuration / Code repository
    private String configurationLocation;

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
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

    public String getProductCategory() {
        return productCategory;
    }

    public void setProductCategory(String productCategory) {
        this.productCategory = productCategory;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getSubdomainPattern() {
        return subdomainPattern;
    }

    public void setSubdomainPattern(String subdomainPattern) {
        this.subdomainPattern = subdomainPattern;
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

    public String getConfigurationLocation() {
        return configurationLocation;
    }

    public void setConfigurationLocation(String configurationLocation) {
        this.configurationLocation = configurationLocation;
    }
}
