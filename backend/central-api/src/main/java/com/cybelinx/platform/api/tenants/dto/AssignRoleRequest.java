package com.cybelinx.platform.api.tenants.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AssignRoleRequest(
        @NotEmpty List<String> roleCodes
) {}
