package com.cybelinx.platform.api.tenants;

import java.util.List;

/** Port of the tenant response contracts from {@code tenant.response.ts}. */
public final class TenantViews {

    public record TenantView(
            String tenantId,
            String tenantCode,
            String name,
            String status,
            String regionCode,
            String country,
            String timezone,
            String createdAt) {}

    public record TenantProductView(
            String tenantProductId,
            String tenantId,
            String productCode,
            String planCode,
            String status,
            String activatedAt) {}

    public record TenantProductListResponse(List<TenantProductView> data) {}

    public record TenantProductActionResponse(String tenantId, String productCode, String status) {}

    public record TenantResourceView(
            String tenantResourceId,
            String tenantId,
            String productCode,
            String resourceTypeCode,
            String isolationMode,
            String environment,
            String status,
            String provisioningState) {}

    public record TenantResourceListResponse(List<TenantResourceView> data) {}

    public record TenantResourceActionResponse(String tenantId, String productCode, String resourceTypeCode, String status) {}

    public record ProvisioningJobView(String jobId, String tenantId, String operation, String state, int progress) {}

    public record TenantMembershipView(
            String membershipId, String tenantId, String userId, String status, List<String> roleCodes, String joinedAt) {}

    public record AccessView(
            String userId, String tenantId, String membershipId, List<String> roles, List<String> permissions) {}

    public record CreateTenantResponse(
            TenantView tenant,
            AccessView access,
            List<TenantProductView> products,
            List<ProvisioningJobView> provisioningJobs) {}

    public record TenantDetailResponse(
            TenantView tenant,
            List<TenantProductView> products,
            List<TenantResourceView> resources,
            List<ProvisioningJobView> provisioningJobs,
            List<TenantMembershipView> memberships) {}

    public record TenantListResponse(List<TenantView> data, Meta meta) {}

    public record Meta(int page, int limit, long total, long totalPages) {}

    public record TenantActionResponse(String tenantId, String status) {}

    private TenantViews() {
    }
}