package com.cybelinx.platform.api.onboarding.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record GenericBatchOnboardRequest(
        @NotEmpty(message = "items cannot be empty")
        @Valid
        List<GenericOnboardRequest> items
) {}
