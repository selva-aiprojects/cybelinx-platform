package com.cybelinx.platform.api.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** New version of an existing product. */
public class CreateProductVersionRequest {

    @NotBlank(message = "version is required")
    @Pattern(
            regexp = "^\\d{1,3}(\\.\\d{1,3}){1,2}$",
            message = "version must be semver-like, e.g. \"1.0\" or \"1.0.0\"")
    @Size(max = 32, message = "version must not exceed 32 characters")
    private String version;

    @Size(max = 5000, message = "releaseNotes must not exceed 5000 characters")
    private String releaseNotes;

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getReleaseNotes() {
        return releaseNotes;
    }

    public void setReleaseNotes(String releaseNotes) {
        this.releaseNotes = releaseNotes;
    }
}