package com.cybelinx.platform.api.products.dto;

import jakarta.validation.constraints.Size;

/** Partial product update (both fields optional). */
public class UpdateProductRequest {

    @Size(max = 200, message = "name must not exceed 200 characters")
    private String name;

    @Size(max = 2000, message = "description must not exceed 2000 characters")
    private String description;

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
}