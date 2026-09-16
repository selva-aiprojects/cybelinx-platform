package com.cybelinx.platform.api.tenants.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateMembershipRequest(
        @NotBlank @Email String email,
        String displayName,
        List<String> roleCodes
) {}
