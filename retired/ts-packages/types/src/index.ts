export const TENANT_STATUSES = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
  'DELETION_PENDING',
  'DELETED',
] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const ISOLATION_MODES = [
  'SHARED_POOL',
  'SCHEMA_PER_TENANT',
  'DEDICATED_DATABASE',
  'DEDICATED_INFRASTRUCTURE',
] as const;
export type IsolationMode = (typeof ISOLATION_MODES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'DISABLED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const TENANT_PRODUCT_STATUSES = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'LAPSED',
  'DISABLED',
] as const;
export type TenantProductStatus = (typeof TENANT_PRODUCT_STATUSES)[number];

export const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ENTITLEMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const PRODUCT_CODES = ['JIOPLIX', 'JIOPLIX_SMART', 'LIMS', 'STOREAI', 'SYNTHALYST_HRM'] as const;
export type ProductCode = (typeof PRODUCT_CODES)[number];

export const PLATFORM_ROLES = [
  'CYBELINX_PLATFORM_ADMIN',
  'CYBELINX_SUPPORT',
  'CYBELINX_AUDITOR',
  'TENANT_OWNER',
  'TENANT_ADMIN',
  'TENANT_USER',
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export interface Tenant {
  tenantId: string;
  tenantCode: string;
  name: string;
  status: TenantStatus;
  tenantType?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

export interface TenantProduct {
  tenantId: string;
  productId: string;
  status: TenantProductStatus;
  planCode?: string;
  activatedAt?: string;
  expiresAt?: string;
}

export interface TenantResource {
  tenantId: string;
  productId: string;
  resourceId: string;
  isolationMode: IsolationMode;
  databaseHost?: string;
  databaseName?: string;
  schemaName?: string;
  region?: string;
  credentialReference?: string;
  status: string;
}

export interface Membership {
  membershipId: string;
  userId: string;
  tenantId: string;
  status: MembershipStatus;
  roles: PlatformRole[];
}

export const isTenantStatus = (value: unknown): value is TenantStatus =>
  TENANT_STATUSES.some((status) => status === value);

export const isEnvironment = (value: unknown): value is Environment =>
  ENVIRONMENTS.some((env) => env === value);

export const isIsolationMode = (value: unknown): value is IsolationMode =>
  ISOLATION_MODES.some((mode) => mode === value);

export const isEntitlementStatus = (value: unknown): value is EntitlementStatus =>
  ENTITLEMENT_STATUSES.some((status) => status === value);

export const isProductCode = (value: unknown): value is ProductCode =>
  PRODUCT_CODES.some((code) => code === value);

export const isProductStatus = (value: unknown): value is ProductStatus =>
  PRODUCT_STATUSES.some((status) => status === value);

export const isTenantProductStatus = (value: unknown): value is TenantProductStatus =>
  TENANT_PRODUCT_STATUSES.some((status) => status === value);

export const isPlanStatus = (value: unknown): value is PlanStatus =>
  PLAN_STATUSES.some((status) => status === value);