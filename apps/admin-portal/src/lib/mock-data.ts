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
  ProductOnboardingDefinition,
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
    productId: '00000000-0000-0000-0000-000000000070',
    productCode: 'CYBEHEALTH',
    portfolioCode: 'CYBEHEALTH',
    name: 'CybeHealth Portfolio Suite',
    description: 'Clinical EMR, FHIR Interoperability & ABDM Level 2 Certified Healthcare Portfolio Suite',
    baseUrl: 'https://cybelinx.com/products/cybehealth',
    productCategory: 'REGULATED_MARKETS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000071',
    createdAt: '2026-09-15T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000010',
    productCode: 'JIOPLIX',
    portfolioCode: 'CYBEHEALTH',
    name: 'Jioplix Core',
    description: 'Multi-tenant clinical diagnostics and laboratory operations platform',
    baseUrl: 'https://jioplix.com',
    productCategory: 'REGULATED_MARKETS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000011',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000020',
    productCode: 'JIOPLIX_SMART',
    portfolioCode: 'CYBEHEALTH',
    name: 'Jioplix Smart',
    description: 'AI-assisted diagnostics and intelligent report triage',
    baseUrl: 'https://smart.jioplix.com',
    productCategory: 'REGULATED_MARKETS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000021',
    createdAt: '2026-09-05T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000030',
    productCode: 'LIMS',
    portfolioCode: 'CYBEHEALTH',
    name: 'Cybelinx LIMS',
    description: 'Laboratory Information Management System',
    baseUrl: 'https://lims.cybelinx.com',
    productCategory: 'REGULATED_MARKETS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000031',
    createdAt: '2026-08-15T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000040',
    productCode: 'STOREAI',
    portfolioCode: 'ENTERPRISE_OPERATIONS',
    name: 'StoreAI Composable Commerce',
    description: 'Composable retail commerce, store intelligence & real-time automated inventory analytics',
    baseUrl: 'https://storeai.com',
    productCategory: 'ENTERPRISE_OPERATIONS',
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
    tenantCode: 'ACME_HOSPITAL',
    name: 'ACME Multispecialty Hospital',
    status: 'ACTIVE',
    regionCode: 'ap-south-1',
    country: 'IN',
    timezone: 'Asia/Kolkata',
    createdAt: '2026-09-15T10:15:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000011',
    tenantCode: 'NIKE_STORE',
    name: 'Nike Flagship Retail',
    status: 'ACTIVE',
    regionCode: 'eu-west-1',
    country: 'DE',
    timezone: 'Europe/Berlin',
    createdAt: '2026-09-15T11:20:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000015',
    tenantCode: 'SELVA_HEALTHCARE',
    name: 'Selvakumar Healthcare Group',
    status: 'ACTIVE',
    regionCode: 'ap-south-1',
    country: 'IN',
    timezone: 'Asia/Kolkata',
    createdAt: '2026-09-16T12:00:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000012',
    tenantCode: 'STOREAI_ADIDAS_01',
    name: 'Adidas Sportswear Store',
    status: 'ACTIVE',
    regionCode: 'eu-west-1',
    country: 'IE',
    timezone: 'UTC',
    createdAt: '2026-09-12T00:00:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000013',
    tenantCode: 'STORE_PUMA_01',
    name: 'Puma Retail Store',
    status: 'ACTIVE',
    regionCode: 'eu-west-1',
    country: 'IE',
    timezone: 'UTC',
    createdAt: '2026-09-14T00:00:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000014',
    tenantCode: 'JIOPLIX_APOLLO_01',
    name: 'Apollo Multispecialty Hospital',
    status: 'ACTIVE',
    regionCode: 'ap-south-1',
    country: 'IN',
    timezone: 'Asia/Kolkata',
    createdAt: '2026-09-15T00:00:00Z',
  },
];


const INITIAL_TENANT_PRODUCTS: Record<string, TenantProductView[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000301',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productCode: 'JIOPLIX',
      planCode: 'JIOPLIX_ENTERPRISE',
      status: 'ACTIVE',
      activatedAt: '2026-09-15T10:15:00Z',
      appUrl: 'https://acme.jioplix.com',
    },
  ],
  '00000000-0000-0000-0000-000000000011': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000311',
      tenantId: '00000000-0000-0000-0000-000000000011',
      productCode: 'STOREAI',
      planCode: 'STOREAI_STANDARD',
      status: 'ACTIVE',
      activatedAt: '2026-09-15T11:20:00Z',
      appUrl: 'https://nike.storeai.com',
    },
  ],
  '00000000-0000-0000-0000-000000000015': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000315',
      tenantId: '00000000-0000-0000-0000-000000000015',
      productCode: 'JIOPLIX',
      planCode: 'JIOPLIX_ENTERPRISE',
      status: 'ACTIVE',
      activatedAt: '2026-09-16T12:00:00Z',
      appUrl: 'https://selvahealthcare.jioplix.com',
    },
  ],
  '00000000-0000-0000-0000-000000000012': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000312',
      tenantId: '00000000-0000-0000-0000-000000000012',
      productCode: 'STOREAI',
      planCode: 'STOREAI_ENTERPRISE',
      status: 'ACTIVE',
      activatedAt: '2026-09-12T00:00:00Z',
      appUrl: 'https://adidas.storeai.cybelinx.com',
    },
  ],
  '00000000-0000-0000-0000-000000000013': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000313',
      tenantId: '00000000-0000-0000-0000-000000000013',
      productCode: 'STOREAI',
      planCode: 'STOREAI_ENTERPRISE',
      status: 'ACTIVE',
      activatedAt: '2026-09-14T00:00:00Z',
      appUrl: 'https://puma.storeai.cybelinx.com',
    },
  ],
  '00000000-0000-0000-0000-000000000014': [
    {
      tenantProductId: '00000000-0000-0000-0000-000000000314',
      tenantId: '00000000-0000-0000-0000-000000000014',
      productCode: 'JIOPLIX',
      planCode: 'JIOPLIX_ENTERPRISE',
      status: 'ACTIVE',
      activatedAt: '2026-09-15T00:00:00Z',
      appUrl: 'https://apollo.jioplix.com',
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
  '00000000-0000-0000-0000-000000000011': [
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000411',
      tenantId: '00000000-0000-0000-0000-000000000011',
      productCode: 'STOREAI',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'DEMO',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000412',
      tenantId: '00000000-0000-0000-0000-000000000011',
      productCode: 'STOREAI',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
  ],
  '00000000-0000-0000-0000-000000000012': [
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000421',
      tenantId: '00000000-0000-0000-0000-000000000012',
      productCode: 'STOREAI',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'DEMO',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000422',
      tenantId: '00000000-0000-0000-0000-000000000012',
      productCode: 'STOREAI',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
  ],
  '00000000-0000-0000-0000-000000000013': [
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000013',
      tenantId: '00000000-0000-0000-0000-000000000013',
      productCode: 'STOREAI',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'DEMO',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    },
  ],
  '00000000-0000-0000-0000-000000000014': [
    {
      tenantResourceId: '00000000-0000-0000-0000-000000000441',
      tenantId: '00000000-0000-0000-0000-000000000014',
      productCode: 'JIOPLIX',
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
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

export const MOCK_ONBOARDING_DEFINITIONS: ProductOnboardingDefinition[] = [
  {
    productCode: 'JIOPLIX',
    version: '1.0.0',
    displayName: 'Jioplix Hospital Management System',
    description: 'Enterprise clinical EHR, inpatient/outpatient hospital operations, and multi-facility healthcare platform',
    provider: 'JIOPLIX_NEXUS',
    tenantIdentifier: {
      key: 'externalId',
      label: 'Hospital External ID',
      placeholder: 'e.g. JIOPLIX_NEXUS, HOSP_APOLLO_01',
      required: true,
      hint: 'External primary key in upstream Jioplix hospital database',
    },
    fields: [
      {
        key: 'hospitalName',
        label: 'Hospital Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Apollo Multispecialty Hospital',
        hint: 'Official healthcare institution name',
      },
      {
        key: 'domain',
        label: 'Hospital Domain / Portal URL',
        type: 'url',
        required: false,
        placeholder: 'https://apollo.jioplix.com',
        hint: 'Dedicated vanity or primary web domain',
      },
      {
        key: 'contactEmail',
        label: 'Contact / Admin Email',
        type: 'email',
        required: true,
        placeholder: 'admin@apollo.org',
        hint: 'Official email for platform administrative notices',
      },
      {
        key: 'country',
        label: 'Country / Jurisdiction',
        type: 'text',
        required: false,
        placeholder: 'India',
        hint: 'Legal operating jurisdiction for healthcare compliance',
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'text',
        required: false,
        placeholder: 'Asia/Kolkata',
        hint: 'Operating timezone for patient appointments and clinical logs',
      },
    ],
    subscription: {
      required: true,
      defaultPlanCode: 'JIOPLIX_ENTERPRISE',
      availablePlans: ['JIOPLIX_ENTERPRISE', 'HEALTHCARE_TIER', 'CLINIC_STARTER'],
    },
    resource: {
      defaultResourceType: 'POSTGRES_SCHEMA',
      supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE'],
      defaultIsolationMode: 'SCHEMA_PER_TENANT',
      schemaPrefix: 'jioplix_',
    },
    provisioningSteps: [
      'VALIDATE_TENANT',
      'MAP_EXTERNAL_ID',
      'ATTACH_SUBSCRIPTION',
      'PROVISION_SCHEMA',
      'EMIT_OUTBOX_EVENT',
    ],
    healthCheckEndpoint: '/health',
  },
  {
    productCode: 'STOREAI',
    version: '1.0.0',
    displayName: 'StoreAI Composable Commerce',
    description: 'Multi-brand autonomous retail engine, dynamic checkout, inventory management, and omnichannel commerce platform',
    provider: 'STOREAI_NEXUS',
    tenantIdentifier: {
      key: 'externalId',
      label: 'Store External ID',
      placeholder: 'e.g. STOREAI_NEXUS, STORE_NIKE_01',
      required: true,
      hint: 'Merchant or store identifier in existing StoreAI retail database',
    },
    fields: [
      {
        key: 'storeName',
        label: 'Store / Merchant Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Nike Flagship Online',
        hint: 'Commercial name of the store or retail brand',
      },
      {
        key: 'domain',
        label: 'Store Domain / Storefront URL',
        type: 'url',
        required: false,
        placeholder: 'https://nike.storeai.com',
        hint: 'Custom or hosted storefront domain',
      },
      {
        key: 'contactEmail',
        label: 'Merchant Contact Email',
        type: 'email',
        required: true,
        placeholder: 'merchant@nike.com',
        hint: 'Primary merchant administrator email address',
      },
      {
        key: 'adminUserId',
        label: 'Merchant Admin User ID',
        type: 'text',
        required: false,
        placeholder: 'usr_nike_owner_01',
        hint: 'Existing StoreAI merchant user identifier',
      },
    ],
    subscription: {
      required: true,
      defaultPlanCode: 'STOREAI_ENTERPRISE',
      availablePlans: ['STOREAI_ENTERPRISE', 'STOREAI_GROWTH', 'STOREAI_STARTER'],
    },
    resource: {
      defaultResourceType: 'POSTGRES_SCHEMA',
      supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE'],
      defaultIsolationMode: 'SCHEMA_PER_TENANT',
      schemaPrefix: 'storeai_',
    },
    provisioningSteps: [
      'VALIDATE_TENANT',
      'MAP_EXTERNAL_ID',
      'ATTACH_SUBSCRIPTION',
      'PROVISION_SCHEMA',
      'EMIT_OUTBOX_EVENT',
    ],
    healthCheckEndpoint: '/health',
  },
  {
    productCode: 'LIMS',
    version: '1.0.0',
    displayName: 'Laboratory Information Management (LIMS)',
    description: 'Clinical pathology, sample tracking, specimen analyzer integration, and NABL/CAP compliant laboratory workflow engine',
    provider: 'LIMS_NEXUS',
    tenantIdentifier: {
      key: 'externalId',
      label: 'Lab External ID',
      placeholder: 'e.g. LAB_METROPOLIS_01',
      required: true,
      hint: 'Identifier in laboratory equipment & specimen management system',
    },
    fields: [
      {
        key: 'labName',
        label: 'Diagnostic Lab / Pathology Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Metropolis Diagnostics Central Lab',
        hint: 'Accredited testing facility name',
      },
      {
        key: 'domain',
        label: 'Laboratory Portal URL',
        type: 'url',
        required: false,
        placeholder: 'https://lab.metropolis.com',
        hint: 'Patient and physician report retrieval portal',
      },
      {
        key: 'contactEmail',
        label: 'Lab Director / Admin Email',
        type: 'email',
        required: true,
        placeholder: 'director@metropolis.com',
        hint: 'Primary contact for compliance notices',
      },
    ],
    subscription: {
      required: true,
      defaultPlanCode: 'LIMS_ENTERPRISE',
      availablePlans: ['LIMS_ENTERPRISE', 'LIMS_PROFESSIONAL', 'LIMS_ESSENTIAL'],
    },
    resource: {
      defaultResourceType: 'POSTGRES_SCHEMA',
      supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL'],
      defaultIsolationMode: 'SCHEMA_PER_TENANT',
      schemaPrefix: 'lims_',
    },
    provisioningSteps: [
      'VALIDATE_TENANT',
      'MAP_EXTERNAL_ID',
      'ATTACH_SUBSCRIPTION',
      'PROVISION_SCHEMA',
      'EMIT_OUTBOX_EVENT',
    ],
    healthCheckEndpoint: '/health',
  },
];

