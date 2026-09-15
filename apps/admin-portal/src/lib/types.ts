export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorEnvelope {
  statusCode: number;
  code?: string;
  message: string;
  error?: string;
  details?: unknown;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type EntitlementStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type TenantStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'DELETION_PENDING';
export type TenantProductStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'LAPSED';
export type TenantResourceStatus = 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DEGRADED' | 'FAILED';
export type ResourceStatus = 'ACTIVE' | 'PROVISIONING' | 'DEGRADED' | 'DISABLED';
export type Environment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
export type IsolationMode = 'SHARED_POOL' | 'SCHEMA_PER_TENANT' | 'DEDICATED_DATABASE' | 'DEDICATED_INFRASTRUCTURE';
export type ProvisioningState = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE';
export type ProvisioningOperation = 'PROVISION' | 'DEPROVISION' | 'MIGRATE';

export interface ProductView {
  productId: string;
  productCode: string;
  portfolioCode?: string | null;
  name: string;
  description: string | null;
  baseUrl: string | null;
  status: ProductStatus;
  productCategory?: 'REGULATED_MARKETS' | 'ENTERPRISE_OPERATIONS' | 'CORE_PAAS_AI';
  currentVersionId: string | null;
  createdAt: string;
}

export interface ProductListResponse {
  data: ProductView[];
  meta: PageMeta;
}

export interface ProductActionResponse {
  productId: string;
  status: string;
}

export interface ProductVersionView {
  versionId: string;
  version: string;
  releaseNotes: string | null;
  isCurrent: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface ProductVersionListResponse {
  data: ProductVersionView[];
}

export interface PublishVersionResponse {
  versionId: string;
  version: string;
  isCurrent: boolean;
}

export interface PlanView {
  planId: string;
  planCode: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  trialDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponse {
  data: PlanView[];
}

export interface PlanActionResponse {
  planId: string;
  status: string;
}

export interface EntitlementView {
  entitlementId: string;
  key: string;
  name: string | null;
  value: Record<string, unknown> | null;
  status: EntitlementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementListResponse {
  data: EntitlementView[];
}

export interface EntitlementActionResponse {
  entitlementId: string;
  status: string;
}

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

export interface TenantListResponse {
  data: TenantView[];
  meta: PageMeta;
}

export interface TenantProductView {
  tenantProductId: string;
  tenantId: string;
  productCode: string;
  planCode: string;
  status: TenantProductStatus;
  activatedAt: string | null;
  appUrl: string | null;
}

export interface TenantProductListResponse {
  data: TenantProductView[];
}

export interface TenantProductActionResponse {
  tenantId: string;
  productCode: string;
  status: string;
}

export interface TenantResourceView {
  tenantResourceId: string;
  tenantId: string;
  productCode: string;
  resourceTypeCode: string;
  isolationMode: IsolationMode;
  environment: Environment;
  status: TenantResourceStatus;
  provisioningState: ProvisioningState;
}

export interface TenantResourceListResponse {
  data: TenantResourceView[];
}

export interface TenantResourceActionResponse {
  tenantId: string;
  productCode: string;
  resourceTypeCode: string;
  status: string;
}

export interface ProvisioningJobView {
  jobId: string;
  tenantId: string;
  operation: ProvisioningOperation;
  state: ProvisioningState;
  progress: number;
}

export interface TenantMembershipView {
  membershipId: string;
  tenantId: string;
  userId: string;
  status: MembershipStatus;
  roleCodes: string[];
  joinedAt: string | null;
}

export interface AccessView {
  userId: string;
  tenantId: string;
  membershipId: string;
  roles: string[];
  permissions: string[];
}

export interface CreateTenantResponse {
  tenant: TenantView;
  access: AccessView;
  products: TenantProductView[];
  provisioningJobs: ProvisioningJobView[];
}

export interface TenantDetailResponse {
  tenant: TenantView;
  products: TenantProductView[];
  resources: TenantResourceView[];
  provisioningJobs: ProvisioningJobView[];
  memberships: TenantMembershipView[];
}

export interface TenantActionResponse {
  tenantId: string;
  status: string;
}

// --- Request bodies ------------------------------------------------------

export interface CreateProductRequest {
  productCode: string;
  name: string;
  description?: string;
  baseUrl?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
}

export interface UpdateProductStatusRequest {
  status: ProductStatus;
}

export interface CreateProductVersionRequest {
  version: string;
  releaseNotes?: string;
}

export interface CreatePlanRequest {
  planCode: string;
  name: string;
  description?: string;
  trialDays?: number | null;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  trialDays?: number | null;
}

export interface UpdatePlanStatusRequest {
  status: PlanStatus;
}

export interface CreateEntitlementRequest {
  key: string;
  name?: string;
  value?: Record<string, unknown>;
}

export interface UpdateEntitlementRequest {
  name?: string;
  value?: Record<string, unknown>;
}

export interface UpdateEntitlementStatusRequest {
  status: EntitlementStatus;
}

export interface CreateTenantRequest {
  tenantCode: string;
  name: string;
  regionCode?: string;
  country?: string;
  timezone?: string;
  products?: TenantProductRequest[];
}

export interface TenantProductRequest {
  productCode: string;
  planCode?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  regionCode?: string;
  country?: string;
  timezone?: string;
}

export interface AttachTenantProductRequest {
  productCode: string;
  planCode?: string;
}

export interface UpdateTenantProductStatusRequest {
  status: TenantProductStatus;
}

export interface RegisterTenantResourceRequest {
  productCode: string;
  resourceTypeCode: string;
  isolationMode: IsolationMode;
  environment: Environment;
}

export interface UpdateTenantResourceRequest {
  schemaName?: string;
  migrationVersion?: string;
  credentialReference?: string;
}

// --- Audit & Events ------------------------------------------------------

export interface AuditEventView {
  eventId: string;
  tenantId?: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditListResponse {
  data: AuditEventView[];
  meta: PageMeta;
}

export interface PlatformEventView {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  tenantId?: string;
  createdAt: string;
}

export interface PlatformEventListResponse {
  data: PlatformEventView[];
  meta: PageMeta;
}

// --- Usage & Metering ---------------------------------------------------

export interface UsageEventView {
  usageEventId: string;
  tenantId: string;
  productId: string;
  eventType: string;
  quantity: number;
  idempotencyKey?: string;
  recordedAt: string;
}

export interface UsageListResponse {
  data: UsageEventView[];
  meta: PageMeta;
}

export interface IngestUsageRequest {
  productId: string;
  eventType: string;
  quantity: number;
  idempotencyKey?: string;
}

// --- External IDs -------------------------------------------------------

export interface TenantExternalIdView {
  mappingId: string;
  tenantId: string;
  productId: string;
  provider: string;
  externalId: string;
  createdAt: string;
}

export interface TenantExternalIdListResponse {
  data: TenantExternalIdView[];
}

export interface RegisterExternalIdRequest {
  productId: string;
  provider: string;
  externalId: string;
}