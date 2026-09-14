import type {
  EntitlementView,
  PlanView,
  ProductVersionView,
  ProductView,
  ProvisioningJobView,
  TenantMembershipView,
  TenantProductView,
  TenantResourceView,
  TenantView,
} from './types';

export interface MockStore {
  products: ProductView[];
  productVersions: Record<string, ProductVersionView[]>;
  plans: Record<string, PlanView[]>;
  entitlements: Record<string, EntitlementView[]>;
  tenants: TenantView[];
  tenantProducts: Record<string, TenantProductView[]>;
  tenantResources: Record<string, TenantResourceView[]>;
  provisioningJobs: Record<string, ProvisioningJobView[]>;
  memberships: Record<string, TenantMembershipView[]>;
}

const INITIAL_PRODUCTS: ProductView[] = [
  {
    productId: '00000000-0000-0000-0000-000000000010',
    productCode: 'JIOPLIX',
    name: 'Jioplix Core',
    description: 'Multi-tenant clinical diagnostics and laboratory operations platform',
    baseUrl: 'https://jioplix.com',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000011',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000020',
    productCode: 'JIOPLIX_SMART',
    name: 'Jioplix Smart',
    description: 'AI-assisted diagnostics and intelligent report triage',
    baseUrl: 'https://smart.jioplix.com',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000021',
    createdAt: '2026-09-05T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000030',
    productCode: 'LIMS',
    name: 'Cybelinx LIMS',
    description: 'Laboratory Information Management System',
    baseUrl: 'https://lims.cybelinx.com',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000031',
    createdAt: '2026-08-15T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000040',
    productCode: 'STOREAI',
    name: 'StoreAI Retail Intelligence',
    description: 'Store intelligence and automated inventory analytics',
    baseUrl: 'https://storeai.com',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000041',
    createdAt: '2026-09-10T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000050',
    productCode: 'SYNTHALYST_HRM',
    name: 'Synthalyst HRM',
    description: 'Human Resource Management for healthcare institutions',
    baseUrl: 'https://synthalyst.com',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000051',
    createdAt: '2026-09-01T00:00:00Z',
  },
];

const INITIAL_VERSIONS: Record<string, ProductVersionView[]> = {
  '00000000-0000-0000-0000-000000000010': [
    {
      versionId: '00000000-0000-0000-0000-000000000011',
      version: '1.0.0',
      releaseNotes: 'Production GA release with HIPAA-compliant diagnostics suite',
      isCurrent: true,
      publishedAt: '2026-09-01T00:00:00Z',
      createdAt: '2026-08-20T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000020': [
    {
      versionId: '00000000-0000-0000-0000-000000000021',
      version: '0.9.0',
      releaseNotes: 'Public preview with AI triage model v2',
      isCurrent: true,
      publishedAt: '2026-09-05T00:00:00Z',
      createdAt: '2026-08-25T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000030': [
    {
      versionId: '00000000-0000-0000-0000-000000000031',
      version: '2.1.0',
      releaseNotes: 'Enhanced instrument integration and barcode tracking',
      isCurrent: true,
      publishedAt: '2026-08-15T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000040': [
    {
      versionId: '00000000-0000-0000-0000-000000000041',
      version: '1.2.0',
      releaseNotes: 'Multi-store real-time replenishment alerts',
      isCurrent: true,
      publishedAt: '2026-09-10T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000050': [
    {
      versionId: '00000000-0000-0000-0000-000000000051',
      version: '1.0.1',
      releaseNotes: 'Maintenance update for payroll integration',
      isCurrent: true,
      publishedAt: '2026-09-01T00:00:00Z',
      createdAt: '2026-08-28T00:00:00Z',
    },
  ],
};

const INITIAL_PLANS: Record<string, PlanView[]> = {
  '00000000-0000-0000-0000-000000000010': [
    {
      planId: '00000000-0000-0000-0000-000000000111',
      planCode: 'STARTER',
      name: 'Starter Plan',
      description: 'Up to 10 clinical operators with essential diagnostics modules',
      status: 'ACTIVE',
      trialDays: 14,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      planId: '00000000-0000-0000-0000-000000000112',
      planCode: 'PROFESSIONAL',
      name: 'Professional Plan',
      description: 'Up to 50 clinical operators with automated triage and audit logs',
      status: 'ACTIVE',
      trialDays: 30,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      planId: '00000000-0000-0000-0000-000000000113',
      planCode: 'ENTERPRISE',
      name: 'Enterprise Plan',
      description: 'Unlimited clinical operators, dedicated database and 24/7 SLA',
      status: 'ACTIVE',
      trialDays: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000040': [
    {
      planId: '00000000-0000-0000-0000-000000000141',
      planCode: 'STARTER',
      name: 'StoreAI Starter',
      description: 'Single store inventory forecasting',
      status: 'ACTIVE',
      trialDays: 14,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ],
};

const INITIAL_ENTITLEMENTS: Record<string, EntitlementView[]> = {
  '00000000-0000-0000-0000-000000000111': [
    {
      entitlementId: '00000000-0000-0000-0000-000000000211',
      key: 'max_users',
      name: 'Maximum Operator Seats',
      value: { limit: 10 },
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      entitlementId: '00000000-0000-0000-0000-000000000212',
      key: 'api_access',
      name: 'REST API Access',
      value: { enabled: true, rateLimitPerMin: 120 },
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      entitlementId: '00000000-0000-0000-0000-000000000213',
      key: 'storage_gb',
      name: 'Storage Allowance (GB)',
      value: { limitGb: 50 },
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ],
};

const INITIAL_TENANTS: TenantView[] = [
  {
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantCode: 'acme',
    name: 'Acme Corporation',
    status: 'ACTIVE',
    regionCode: 'eu-west-1',
    country: 'IE',
    timezone: 'UTC',
    createdAt: '2026-09-01T00:00:00Z',
  },
];

const INITIAL_TENANT_PRODUCTS: Record<string, TenantProductView[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000301',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productCode: 'JIOPLIX',
      planCode: 'STARTER',
      status: 'ACTIVE',
      activatedAt: '2026-09-01T00:00:00Z',
      appUrl: 'https://acme.jioplix.com',
    },
    {
      tenantProductId: '00000000-0000-0000-0000-000000000302',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productCode: 'STOREAI',
      planCode: 'STARTER',
      status: 'ACTIVE',
      activatedAt: '2026-09-02T00:00:00Z',
      appUrl: 'https://acme.storeai.com',
    },
  ],
};

const INITIAL_TENANT_RESOURCES: Record<string, TenantResourceView[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000401',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productCode: 'JIOPLIX',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000402',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productCode: 'JIOPLIX',
      resourceTypeCode: 'OBJECT_STORAGE',
      isolationMode: 'SHARED_POOL',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
  ],
};

const INITIAL_JOBS: Record<string, ProvisioningJobView[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      jobId: '00000000-0000-0000-0000-000000000501',
      tenantId: '00000000-0000-0000-0000-000000000001',
      operation: 'PROVISION',
      state: 'SUCCEEDED',
      progress: 100,
    },
  ],
};

const INITIAL_MEMBERSHIPS: Record<string, TenantMembershipView[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      membershipId: '00000000-0000-0000-0000-000000000601',
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: 'seed-dev-admin-0001',
      status: 'ACTIVE',
      roleCodes: ['CYBELINX_PLATFORM_ADMIN', 'TENANT_ADMIN'],
      joinedAt: '2026-09-01T00:00:00Z',
    },
  ],
};

function createInitialStore(): MockStore {
  return {
    products: [...INITIAL_PRODUCTS],
    productVersions: { ...INITIAL_VERSIONS },
    plans: { ...INITIAL_PLANS },
    entitlements: { ...INITIAL_ENTITLEMENTS },
    tenants: [...INITIAL_TENANTS],
    tenantProducts: { ...INITIAL_TENANT_PRODUCTS },
    tenantResources: { ...INITIAL_TENANT_RESOURCES },
    provisioningJobs: { ...INITIAL_JOBS },
    memberships: { ...INITIAL_MEMBERSHIPS },
  };
}

// Global in-memory instance for the server runtime
const globalForStore = globalThis as unknown as { __cybelinx_mock_store?: MockStore };
export const mockStore: MockStore = globalForStore.__cybelinx_mock_store ?? createInitialStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.__cybelinx_mock_store = mockStore;
}
