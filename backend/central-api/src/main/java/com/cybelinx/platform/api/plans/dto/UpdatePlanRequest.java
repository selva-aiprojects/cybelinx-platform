package com.cybelinx.platform.api.plans.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Partial plan update (all fields optional). */
public class UpdatePlanRequest {

    @Size(max = 120, message = "name must not exceed 120 characters")
    private String name;

    @Size(max = 2000, message = "description must not exceed 2000 characters")
    private String description;

    @Min(value = 0, message = "trialDays must not be negative")
    @Max(value = 730, message = "trialDays must not exceed 730")
    private Integer trialDays;

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