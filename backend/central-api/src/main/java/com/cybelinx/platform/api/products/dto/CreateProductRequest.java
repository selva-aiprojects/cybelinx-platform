package com.cybelinx.platform.api.products.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Port of the product creation DTO. */
public class CreateProductRequest {

    @NotNull(message = "productCode must be uppercase letters, digits or \"_\"")
    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "productCode must be uppercase letters, digits or \"_\"")
    private String productCode;

    @NotNull(message = "name must be a string")
    @Size(max = 200, message = "name must not exceed 200 characters")
    private String name;

    @Size(max = 2000, message = "description must not exceed 2000 characters")
    private String description;

    @Size(max = 256, message = "baseUrl must not exceed 256 characters")
    private String baseUrl;

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

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
}