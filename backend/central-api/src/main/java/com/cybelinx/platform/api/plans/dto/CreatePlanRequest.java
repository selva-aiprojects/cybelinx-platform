package com.cybelinx.platform.api.plans.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** New plan / SKU for a product. */
public class CreatePlanRequest {

    @NotNull(message = "planCode is required")
    @Pattern(
            regexp = "^[A-Z][A-Z0-9_]{1,63}$",
            message = "planCode must be uppercase letters, digits or \"_\"")
    private String planCode;

    @NotNull(message = "name must be a string")
    @Size(max = 120, message = "name must not exceed 120 characters")
    private String name;

    @Size(max = 2000, message = "description must not exceed 2000 characters")
    private String description;

    @Min(value = 0, message = "trialDays must not be negative")
    @Max(value = 730, message = "trialDays must not exceed 730")
    private Integer trialDays;

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
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

    public Integer getTrialDays() {
        return trialDays;
    }

    public void setTrialDays(Integer trialDays) {
        this.trialDays = trialDays;
    }
}