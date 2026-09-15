package com.cybelinx.platform.api.iam;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** DTO views for IAM (Identity & Access Management) APIs. */
public class IamViews {

    public record TenantIdpConfigRequest(
            @NotBlank(message = "providerType is required") String providerType,
            String issuer,
            String jwksUri,
            String audience,
            String clientId,
            String credentialReference,
            Boolean enabled
    ) {}

    public record TenantIdpConfigResponse(
            String id,
            String tenantId,
            String providerType,
            String issuer,
            String jwksUri,
            String audience,
            String clientId,
            String credentialReference,
            boolean enabled,
            String createdAt,
            String updatedAt
    ) {}

    public record SupportedIdpProviderView(
            String providerCode,
            String name,
            String description,
            boolean supportsJwks,
            boolean supportsOidc
    ) {}

    public record TenantMemberView(
            String membershipId,
            String userId,
            String email,
            String displayName,
            String status,
            List<String> roles,
            List<String> permissions,
            String joinedAt
    ) {}

    public record GrantRoleRequest(
            @NotBlank(message = "roleCode is required") String roleCode
    ) {}
}
