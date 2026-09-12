package com.cybelinx.platform.api.tenants.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Port of {@code CreateTenantDto}. */
public class CreateTenantRequest {

    @NotNull(message = "tenantCode must be 2-64 chars, uppercase letters, digits or \"_\"")
    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "tenantCode must be 2-64 chars, uppercase letters, digits or \"_\"")
    private String tenantCode;

    @NotNull(message = "name must be a string")
    @Size(max = 200, message = "name must not exceed 200 characters")
    private String name;

    @Size(max = 32, message = "regionCode must not exceed 32 characters")
    private String regionCode;

    @Pattern(regexp = "^[A-Z]{2}$", message = "country must be a two-letter ISO-3166 code")
    private String country;

    @Size(max = 64, message = "timezone must not exceed 64 characters")
    private String timezone;

    @Valid
    private List<TenantProductRequest> products;

    public String getTenantCode() {
        return tenantCode;
    }

    public void setTenantCode(String tenantCode) {
        this.tenantCode = tenantCode;
    }

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

    public List<TenantProductRequest> getProducts() {
        return products;
    }

    public void setProducts(List<TenantProductRequest> products) {
        this.products = products;
    }
}