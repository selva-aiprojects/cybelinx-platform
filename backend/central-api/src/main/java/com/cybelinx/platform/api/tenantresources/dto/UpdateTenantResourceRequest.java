package com.cybelinx.platform.api.tenantresources.dto;

import jakarta.validation.constraints.Size;

/** Update registry metadata for an existing tenant resource (only provided fields change). */
public class UpdateTenantResourceRequest {

    @Size(max = 128, message = "schemaName must not exceed 128 characters")
    private String schemaName;

    @Size(max = 32, message = "migrationVersion must not exceed 32 characters")
    private String migrationVersion;

    @Size(max = 512, message = "credentialReference must not exceed 512 characters")
    private String credentialReference;

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
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