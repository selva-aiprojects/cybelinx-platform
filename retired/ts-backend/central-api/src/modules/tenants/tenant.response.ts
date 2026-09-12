import { IsolationMode, TenantProductStatus, TenantStatus } from '@cybelinx/types';

export interface TenantView {
  tenantId: string;
  tenantCode: string;
  name: string;
  status: TenantStatus;
  regionCode: string | null;
  country: string | null;
  timezone: string | null;
  createdAt: string;
}

export interface TenantProductView {
  tenantProductId: string;
  tenantId: string;
  productCode: string;
  planCode: string;
  status: TenantProductStatus;
  activatedAt: string | null;
}

export interface TenantResourceView {
  tenantResourceId: string;
  tenantId: string;
  productCode: string;
  resourceTypeCode: string;
  isolationMode: IsolationMode;
  environment: string;
  status: string;
  provisioningState: string;
}

export interface ProvisioningJobView {
  jobId: string;
  tenantId: string;
  operation: string;
  state: string;
  progress: number;
}

export interface CreateTenantResponse {
  tenant: TenantView;
  access: {
    userId: string;
    tenantId: string;
    membershipId: string;
    roles: string[];
    permissions: string[];
  };
  products: TenantProductView[];
  provisioningJobs: ProvisioningJobView[];
}

export interface TenantMembershipView {
  membershipId: string;
  tenantId: string;
  userId: string;
  status: string;
  roleCodes: string[];
  joinedAt: string | null;
}

export interface TenantDetailResponse {
  tenant: TenantView;
  products: TenantProductView[];
  resources: TenantResourceView[];
  provisioningJobs: ProvisioningJobView[];
  memberships: TenantMembershipView[];
}

export interface TenantListResponse {
  data: TenantView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantActionResponse {
  tenantId: string;
  status: TenantStatus;
}