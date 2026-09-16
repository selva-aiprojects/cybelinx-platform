package com.cybelinx.platform.api.onboarding.model;

import java.util.List;

public record GenericBatchOnboardResponse(
        int totalProcessed,
        int succeeded,
        int failed,
        List<GenericOnboardResponse> results
) {}
