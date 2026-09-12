package com.cybelinx.platform.api.tenants.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Port of {@code UpdateTenantDto}. */
public class UpdateTenantRequest {

    private String name;

    private String regionCode;

    @Pattern(regexp = "^[A-Z]{2}$", message = "country must be a two-letter ISO-3166 code")
    private String country;

    @Size(max = 64, message = "timezone must not exceed 64 characters")
    private String timezone;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRegionCode() {
        return regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }
}