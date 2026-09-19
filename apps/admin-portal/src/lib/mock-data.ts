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
  ProductRepositoryView,
  SubscriptionMasterView,
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
  repositories: ProductRepositoryView[];
  subscriptions: SubscriptionMasterView[];
}

export const INITIAL_PRODUCTS: ProductView[] = [
  {
    productId: '00000000-0000-0000-0000-000000000010',
    productCode: 'JIOPLIX',
    portfolioCode: 'HOSPITALITY_AI',
    name: 'Jioplix Hospitality AI Platform',
    description: 'Autonomous AI guest concierge, multi-property smart menus, WhatsApp booking & PMS schema isolation',
    baseUrl: 'https://jioplix.com',
    productCategory: 'ENTERPRISE_OPERATIONS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000011',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000040',
    productCode: 'STOREAI',
    portfolioCode: 'ENTERPRISE_OPERATIONS',
    name: 'StoreAI Composable Commerce',
    description: 'Composable retail commerce, store intelligence & real-time automated inventory analytics',
    baseUrl: 'https://storeai.cybelinx.com',
    productCategory: 'ENTERPRISE_OPERATIONS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000041',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000050',
    productCode: 'SYNTHALYST',
    portfolioCode: 'CORE_PAAS_AI',
    name: 'Synthalyst AI Synthetic Data',
    description: 'Enterprise synthetic data generation, schema-aware test fixtures & compliance validation engine',
    baseUrl: 'https://synthalyst.cybelinx.com',
    productCategory: 'CORE_PAAS_AI',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000051',
    createdAt: '2026-09-10T00:00:00Z',
  },
  {
    productId: '00000000-0000-0000-0000-000000000030',
    productCode: 'LIMS',
    portfolioCode: 'CYBEHEALTH',
    name: 'Cybelinx LIMS',
    description: 'Laboratory Information Management System, sample tracking & clinical audit workflows',
    baseUrl: 'https://lims.cybelinx.com',
    productCategory: 'REGULATED_MARKETS',
    status: 'ACTIVE',
    currentVersionId: '00000000-0000-0000-0000-000000000031',
    createdAt: '2026-08-15T00:00:00Z',
  },
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
];

export const INITIAL_PLANS: Record<string, PlanView[]> = {
  '00000000-0000-0000-0000-000000000010': [
    {
      planId: '00000000-0000-0000-0000-000000000110',
      planCode: 'JIOPLIX_STARTER',
      name: 'Starter — $49/mo',
      description: 'Single boutique property, 1,000 monthly AI guest conversations, digital smart QR menu, email support',
      status: 'ACTIVE',
      trialDays: 14,
      createdAt: '2026-09-19T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    },
    {
      planId: '00000000-0000-0000-0000-000000000111',
      planCode: 'JIOPLIX_PRO',
      name: 'Pro — $149/mo',
      description: 'Up to 3 properties, 10,000 AI interactions, WhatsApp concierge, multilingual (30+ languages), automated check-in',
      status: 'ACTIVE',
      trialDays: 14,
      createdAt: '2026-09-19T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    },
    {
      planId: '00000000-0000-0000-0000-000000000112',
      planCode: 'JIOPLIX_ENTERPRISE',
      name: 'Enterprise — $399/mo',
      description: 'Unlimited properties, unlimited AI conversations, dedicated PostgreSQL tenant schema, Cloudbeds & Opera PMS sync',
      status: 'ACTIVE',
      trialDays: 30,
      createdAt: '2026-09-19T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    },
    {
      planId: '00000000-0000-0000-0000-000000000113',
      planCode: 'JIOPLIX_CUSTOM',
      name: 'Custom White-Label — $999/mo',
      description: 'Full custom white-label mobile app, dedicated database cluster, custom PMS adapter, 99.99% SLA & 24/7 TAM',
      status: 'ACTIVE',
      trialDays: 0,
      createdAt: '2026-09-19T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    },
  ],
  '00000000-0000-0000-0000-000000000040': [
    {
      planId: '00000000-0000-0000-0000-000000000042',
      planCode: 'STOREAI_COMMERCE',
      name: 'StoreAI Retail Growth',
      description: 'Full omnichannel catalog, schema-per-tenant inventory isolation & real-time point of sale sync',
      status: 'ACTIVE',
      trialDays: 14,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ],
};

export const INITIAL_ENTITLEMENTS: Record<string, EntitlementView[]> = {
  '00000000-0000-0000-0000-000000000110': [
    { entitlementId: 'ent-110-1', key: 'max_properties', name: 'Max Properties', value: { limit: 1 }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-110-2', key: 'monthly_ai_conversations', name: 'Monthly AI Conversations', value: { limit: 1000 }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-110-3', key: 'database_isolation', name: 'Database Isolation', value: { strategy: 'SHARED_POOL' }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
  ],
  '00000000-0000-0000-0000-000000000111': [
    { entitlementId: 'ent-111-1', key: 'max_properties', name: 'Max Properties', value: { limit: 3 }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-111-2', key: 'monthly_ai_conversations', name: 'Monthly AI Conversations', value: { limit: 10000 }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-111-3', key: 'whatsapp_concierge', name: 'WhatsApp Concierge Bot', value: { enabled: true }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
  ],
  '00000000-0000-0000-0000-000000000112': [
    { entitlementId: 'ent-112-1', key: 'max_properties', name: 'Max Properties', value: { limit: 'unlimited' }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-112-2', key: 'database_isolation', name: 'Database Isolation Strategy', value: { strategy: 'SCHEMA_PER_TENANT' }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
    { entitlementId: 'ent-112-3', key: 'pms_realtime_sync', name: 'PMS Real-Time Webhooks', value: { enabled: true, providers: ['Cloudbeds', 'Opera', 'RMS'] }, status: 'ACTIVE', createdAt: '2026-09-19T00:00:00Z', updatedAt: '2026-09-19T00:00:00Z' },
  ],
};

export const INITIAL_TENANTS: TenantView[] = [
  {
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantCode: 'acme-hospitality',
    name: 'Acme Hotels & Luxury Resorts',
    status: 'ACTIVE',
    regionCode: 'in-south-1',
    country: 'IND',
    timezone: 'Asia/Kolkata',
    contactEmail: 'gm@acmehotels.com',
    createdAt: '2026-09-18T00:00:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000002',
    tenantCode: 'nike',
    name: 'Nike Global Retail Store',
    status: 'ACTIVE',
    regionCode: 'us-east-1',
    country: 'USA',
    timezone: 'America/New_York',
    contactEmail: 'admin@nike.retail.test',
    createdAt: '2026-09-15T00:00:00Z',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000003',
    tenantCode: 'adidas',
    name: 'Adidas European Flagship',
    status: 'ACTIVE',
    regionCode: 'eu-central-1',
    country: 'DEU',
    timezone: 'Europe/Berlin',
    contactEmail: 'it@adidas.storeai.test',
    createdAt: '2026-09-16T00:00:00Z',
  },
];

export const INITIAL_REPOSITORIES: ProductRepositoryView[] = [
  {
    repositoryId: 'repo-001',
    productId: '00000000-0000-0000-0000-000000000010',
    productCode: 'JIOPLIX',
    name: 'Jioplix Hospitality AI Platform',
    description: 'Autonomous AI guest concierge, multi-property smart menus & PMS schema isolation',
    productCategory: 'ENTERPRISE_OPERATIONS',
    status: 'ACTIVE',
    domain: 'jioplix.com',
    subdomainPattern: '{tenant}.jioplix.com',
    hostingProvider: 'VERCEL',
    deploymentUrl: 'https://jioplix-hospital.vercel.app',
    healthEndpoint: '/api/health',
    databaseProvider: 'POSTGRESQL',
    databaseLocation: 'AWS eu-west-1 RDS',
    databaseConnectionString: null,
    dbUrlDevelopment: 'jdbc:postgresql://localhost:5432/cybelinx_platform',
    dbUrlStaging: null,
    dbUrlProduction: null,
    dbCredentialsReference: null,
    defaultIsolationMode: 'SCHEMA_PER_TENANT',
    schemaPrefix: 'tenant_{tenantCode}_jioplix',
    ddlTemplatePath: 'db/migration/jioplix/init.sql',
    configurationLocation: 'config/jioplix.yml',
    customerCount: 1,
    updatedAt: '2026-09-19T00:00:00Z',
  },
  {
    repositoryId: 'repo-002',
    productId: '00000000-0000-0000-0000-000000000040',
    productCode: 'STOREAI',
    name: 'StoreAI Composable Commerce',
    description: 'Composable retail commerce, store intelligence & inventory analytics',
    productCategory: 'ENTERPRISE_OPERATIONS',
    status: 'ACTIVE',
    domain: 'storeai.cybelinx.com',
    subdomainPattern: '{tenant}.storeai.cybelinx.com',
    hostingProvider: 'VERCEL',
    deploymentUrl: 'https://storeai.cybelinx.com',
    healthEndpoint: '/health',
    databaseProvider: 'POSTGRESQL',
    databaseLocation: 'AWS us-east-1 Aurora',
    databaseConnectionString: null,
    dbUrlDevelopment: 'jdbc:postgresql://localhost:5432/cybelinx_platform',
    dbUrlStaging: null,
    dbUrlProduction: null,
    dbCredentialsReference: null,
    defaultIsolationMode: 'SCHEMA_PER_TENANT',
    schemaPrefix: 'tenant_{tenantCode}_storeai',
    ddlTemplatePath: 'db/migration/storeai/init.sql',
    configurationLocation: 'config/storeai.yml',
    customerCount: 2,
    updatedAt: '2026-09-19T00:00:00Z',
  },
];

export const INITIAL_SUBSCRIPTIONS: SubscriptionMasterView[] = [
  {
    tenantProductId: 'sub-001',
    tenantId: '00000000-0000-0000-0000-000000000001',
    productCode: 'JIOPLIX',
    planCode: 'JIOPLIX_ENTERPRISE',
    status: 'ACTIVE',
    activatedAt: '2026-09-18T10:00:00Z',
    appUrl: 'https://acme-hospitality.jioplix.com',
    tenant: INITIAL_TENANTS[0],
  },
  {
    tenantProductId: 'sub-002',
    tenantId: '00000000-0000-0000-0000-000000000002',
    productCode: 'STOREAI',
    planCode: 'STOREAI_COMMERCE',
    status: 'ACTIVE',
    activatedAt: '2026-09-15T12:00:00Z',
    appUrl: 'https://nike.storeai.cybelinx.com',
    tenant: INITIAL_TENANTS[1],
  },
];

export class InMemoryStore implements MockStore {
  products = [...INITIAL_PRODUCTS];
  productVersions: Record<string, ProductVersionView[]> = {
    '00000000-0000-0000-0000-000000000010': [
      { versionId: '00000000-0000-0000-0000-000000000011', version: '2.4.0', releaseNotes: 'Jioplix Hospitality AI initial platform cutover & automated PMS integration', isCurrent: true, publishedAt: '2026-09-19T00:00:00Z', createdAt: '2026-09-19T00:00:00Z' },
    ],
  };
  plans = { ...INITIAL_PLANS };
  entitlements = { ...INITIAL_ENTITLEMENTS };
  tenants = [...INITIAL_TENANTS];
  tenantProducts: Record<string, TenantProductView[]> = {
    '00000000-0000-0000-0000-000000000001': [
      { tenantProductId: 'sub-001', tenantId: '00000000-0000-0000-0000-000000000001', productCode: 'JIOPLIX', planCode: 'JIOPLIX_ENTERPRISE', status: 'ACTIVE', activatedAt: '2026-09-18T10:00:00Z', appUrl: 'https://acme-hospitality.jioplix.com' },
    ],
  };
  tenantResources: Record<string, TenantResourceView[]> = {
    '00000000-0000-0000-0000-000000000001': [
      { tenantResourceId: 'res-001', tenantId: '00000000-0000-0000-0000-000000000001', productCode: 'JIOPLIX', resourceTypeCode: 'POSTGRES_SCHEMA', isolationMode: 'SCHEMA_PER_TENANT', environment: 'PRODUCTION', status: 'ACTIVE', provisioningState: 'SUCCEEDED' },
    ],
  };
  provisioningJobs: Record<string, ProvisioningJobView[]> = {};
  memberships: Record<string, TenantMembershipView[]> = {};
  repositories = [...INITIAL_REPOSITORIES];
  subscriptions = [...INITIAL_SUBSCRIPTIONS];
}

export const mockStore = new InMemoryStore();
