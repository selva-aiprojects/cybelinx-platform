package com.cybelinx.platform.api.productrepository.dto;

/** Update product repository deployment metadata. */
public class UpdateProductRepositoryRequest {

    private String domain;
    private String databaseLocation;
    private String databaseConnectionString;
    private String configurationLocation;

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
}