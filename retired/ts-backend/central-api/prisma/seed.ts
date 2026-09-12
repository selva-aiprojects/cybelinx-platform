// =====================================================================
// Cybelinx Central Platform — development seed data
// =====================================================================
// Creates reference data (regions, products, versions, plans,
// entitlements, roles, permissions, notifications, resource catalog)
// plus ONE development-only test tenant with a minimal provisioning
// trail.
//
// SECURITY NOTE
//   * No production secrets are ever written. Credential fields are
//     populated with vault-style REFERENCES only.
//   * Only metadata. No patient/doctor/lab/inventory data of any kind.
//
// The seeding is idempotent: it can be run repeatedly.
// =====================================================================

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const NOW = new Date();

const PRODUCTS = [
  { productCode: 'JIOPLIX', name: 'Jioplix', description: 'Outpatient clinic management product' },
  { productCode: 'JIOPLIX_SMART', name: 'Jioplix Smart', description: 'Diagnostics / smart lab product' },
  { productCode: 'LIMS', name: 'LIMS', description: 'Laboratory information management system' },
  { productCode: 'STOREAI', name: 'StoreAI', description: 'Pharmacy / retail store management' },
  { productCode: 'SYNTHALYST_HRM', name: 'SynthalystHRM', description: 'Human resource management for the group' },
];

const REGIONS = [
  { regionCode: 'eu-west-1', name: 'Europe (Ireland)', provider: 'aws' },
  { regionCode: 'us-east-1', name: 'US East (N. Virginia)', provider: 'aws' },
  { regionCode: 'ap-south-1', name: 'Asia Pacific (Mumbai)', provider: 'aws' },
];

const ROLES: Array<{ code: string; name: string; scope: 'PLATFORM' | 'TENANT'; isSystem: boolean }> = [
  { code: 'CYBELINX_PLATFORM_ADMIN', name: 'Cybelinx Platform Administrator', scope: 'PLATFORM', isSystem: true },
  { code: 'CYBELINX_SUPPORT', name: 'Cybelinx Support Agent', scope: 'PLATFORM', isSystem: true },
  { code: 'CYBELINX_AUDITOR', name: 'Cybelinx Platform Auditor', scope: 'PLATFORM', isSystem: true },
  { code: 'TENANT_OWNER', name: 'Tenant Owner', scope: 'TENANT', isSystem: true },
  { code: 'TENANT_ADMIN', name: 'Tenant Administrator', scope: 'TENANT', isSystem: true },
  { code: 'TENANT_USER', name: 'Tenant User', scope: 'TENANT', isSystem: true },
];

const PERMISSIONS = [
  { code: 'tenant:read', name: 'Read tenants', module: 'tenant' },
  { code: 'tenant:write', name: 'Create/update tenants', module: 'tenant' },
  { code: 'membership:manage', name: 'Manage tenant memberships', module: 'membership' },
  { code: 'role:manage', name: 'Manage roles and grants', module: 'rbac' },
  { code: 'product:read', name: 'Read product registry', module: 'product' },
  { code: 'product:provision', name: 'Provision tenant products', module: 'provisioning' },
  { code: 'audit:read', name: 'Read audit log', module: 'audit' },
  { code: 'usage:read', name: 'Read usage/metering data', module: 'usage' },
];

// role code -> permission codes granted
const ROLE_PERMISSIONS: Record<string, string[]> = {
  CYBELINX_PLATFORM_ADMIN: [
    'tenant:read',
    'tenant:write',
    'membership:manage',
    'role:manage',
    'product:read',
    'product:provision',
    'audit:read',
    'usage:read',
  ],
  CYBELINX_SUPPORT: ['tenant:read', 'product:read', 'usage:read'],
  CYBELINX_AUDITOR: ['tenant:read', 'audit:read', 'usage:read'],
  TENANT_OWNER: ['tenant:read', 'tenant:write', 'membership:manage', 'role:manage', 'product:read'],
  TENANT_ADMIN: ['tenant:read', 'membership:manage', 'product:read'],
  TENANT_USER: ['product:read'],
};

const RESOURCE_TYPES = [
  { resourceTypeCode: 'POSTGRES_SCHEMA', name: 'PostgreSQL Schema', description: 'Schema-per-tenant workspace inside a managed database' },
  { resourceTypeCode: 'POSTGRES_DATABASE', name: 'PostgreSQL Database', description: 'Dedicated database for a tenant+product' },
  { resourceTypeCode: 'OBJECT_STORAGE', name: 'Object Storage', description: 'Tenant-scoped object storage bucket' },
];

const NOTIFICATIONS = [
  { code: 'TENANT_PROVISIONED_NOTIFY', eventType: 'TENANT_PROVISIONED', name: 'Tenant provisioned', channels: ['email', 'webhook'], description: 'Fired when a tenant+product has been provisioned' },
  { code: 'PROVISIONING_FAILED_NOTIFY', eventType: 'PROVISIONING_FAILED', name: 'Provisioning failed', channels: ['email'], description: 'Fired when a provisioning job fails' },
];

// Product -> plans (code, name, entitlements key->default value)
const PRODUCT_PLANS: Record<string, Array<{ planCode: string; name: string; entitlements: Array<{ key: string; name: string; value: unknown }> }>> = {
  JIOPLIX: [
    {
      planCode: 'JIOPLIX_ENTERPRISE',
      name: 'Jioplix Enterprise',
      entitlements: [
        { key: 'max_seats', name: 'Maximum seats', value: 250 },
        { key: 'isolation_mode', name: 'Default isolation mode', value: 'SCHEMA_PER_TENANT' },
        { key: 'support_level', name: 'Support level', value: 'priority' },
      ],
    },
  ],
  JIOPLIX_SMART: [
    {
      planCode: 'JIOPLIX_SMART_PRO',
      name: 'Jioplix Smart Professional',
      entitlements: [
        { key: 'max_seats', name: 'Maximum seats', value: 100 },
        { key: 'isolation_mode', name: 'Default isolation mode', value: 'SCHEMA_PER_TENANT' },
      ],
    },
  ],
  LIMS: [
    {
      planCode: 'LIMS_STANDARD',
      name: 'LIMS Standard',
      entitlements: [
        { key: 'max_seats', name: 'Maximum seats', value: 50 },
        { key: 'isolation_mode', name: 'Default isolation mode', value: 'SHARED_POOL' },
      ],
    },
  ],
  STOREAI: [
    {
      planCode: 'STOREAI_PRO',
      name: 'StoreAI Professional',
      entitlements: [
        { key: 'max_stores', name: 'Maximum stores', value: 10 },
        { key: 'isolation_mode', name: 'Default isolation mode', value: 'SHARED_POOL' },
      ],
    },
  ],
  SYNTHALYST_HRM: [
    {
      planCode: 'SYNTHALYST_HRM_STANDARD',
      name: 'SynthalystHRM Standard',
      entitlements: [
        { key: 'max_employees', name: 'Maximum employees', value: 500 },
        { key: 'isolation_mode', name: 'Default isolation mode', value: 'SHARED_POOL' },
      ],
    },
  ],
};

async function seedReferenceData(): Promise<void> {
  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { regionCode: region.regionCode },
      update: { name: region.name, provider: region.provider },
      create: region,
    });
  }
  console.log('[seed] regions OK');

  for (const resource of RESOURCE_TYPES) {
    await prisma.resource.upsert({
      where: { resourceTypeCode: resource.resourceTypeCode },
      update: { name: resource.name, description: resource.description },
      create: resource,
    });
  }
  console.log('[seed] resource catalog OK');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, scope: role.scope as 'PLATFORM' | 'TENANT', isSystem: role.isSystem },
      create: role,
    });
  }
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, module: permission.module },
      create: permission,
    });
  }
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) continue;
    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUnique({ where: { code: permissionCode } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissions_role_permission_unique: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  console.log('[seed] roles & permissions OK');

  for (const notification of NOTIFICATIONS) {
    await prisma.notificationDefinition.upsert({
      where: { code: notification.code },
      update: {
        eventType: notification.eventType,
        name: notification.name,
        description: notification.description,
        channels: notification.channels,
      },
      create: notification,
    });
  }
  console.log('[seed] notifications OK');

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { productCode: product.productCode },
      update: { name: product.name, description: product.description, status: 'ACTIVE' },
      create: { ...product, status: 'ACTIVE' },
    });
  }
  console.log('[seed] products OK');
}

async function seedProductCatalog(): Promise<void> {
  for (const product of PRODUCTS) {
    const record = await prisma.product.findUniqueOrThrow({ where: { productCode: product.productCode } });

    const version = await prisma.productVersion.upsert({
      where: {
        product_versions_product_version_unique: { productId: record.id, version: '1.0.0' },
      },
      update: { isCurrent: true },
      create: { productId: record.id, version: '1.0.0', releaseNotes: 'Initial platform-registered version', isCurrent: true, publishedAt: NOW },
    });

    // mark this version current and point product.currentVersion at it
    await prisma.productVersion.updateMany({
      where: { productId: record.id, id: { not: version.id } },
      data: { isCurrent: false },
    });
    if (record.currentVersionId !== version.id) {
      await prisma.product.update({ where: { id: record.id }, data: { currentVersionId: version.id } });
    }

    for (const plan of PRODUCT_PLANS[product.productCode] ?? []) {
      const planRecord = await prisma.plan.upsert({
        where: {
          plans_product_code_unique: { productId: record.id, planCode: plan.planCode },
        },
        update: { name: plan.name, status: 'ACTIVE' },
        create: { productId: record.id, planCode: plan.planCode, name: plan.name, status: 'ACTIVE' },
      });

      for (const entitlement of plan.entitlements) {
        await prisma.entitlement.upsert({
          where: {
            entitlements_plan_key_unique: { planId: planRecord.id, key: entitlement.key },
          },
          update: { name: entitlement.name, value: entitlement.value as Prisma.InputJsonValue, status: 'ACTIVE' },
          create: {
            planId: planRecord.id,
            key: entitlement.key,
            name: entitlement.name,
            value: entitlement.value as Prisma.InputJsonValue,
            status: 'ACTIVE',
          },
        });
      }
    }
  }
  console.log('[seed] product versions, plans & entitlements OK');
}

async function seedTestTenant(): Promise<void> {
  const region = await prisma.region.findUniqueOrThrow({ where: { regionCode: 'eu-west-1' } });
  const jioplix = await prisma.product.findUniqueOrThrow({ where: { productCode: 'JIOPLIX' } });
  const jioplixPlan = await prisma.plan.findUniqueOrThrow({
    where: { plans_product_code_unique: { productId: jioplix.id, planCode: 'JIOPLIX_ENTERPRISE' } },
  });
  const schemaResource = await prisma.resource.findUniqueOrThrow({ where: { resourceTypeCode: 'POSTGRES_SCHEMA' } });
  const tenantAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'TENANT_ADMIN' } });

  // --- Test tenant -----------------------------------------------------
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: 'ACME' },
    update: { name: 'Acme Medical Diagnostics', status: 'ACTIVE', regionId: region.id },
    create: {
      tenantCode: 'ACME',
      name: 'Acme Medical Diagnostics',
      status: 'ACTIVE',
      regionId: region.id,
    },
  });

  // --- Dev user + identity (no passwords: identity is federated) -------
  const devUser = await prisma.user.upsert({
    where: { email: 'dev.admin@cybelinx.test' },
    update: { displayName: 'Cybelinx Dev Admin', status: 'ACTIVE' },
    create: {
      email: 'dev.admin@cybelinx.test',
      displayName: 'Cybelinx Dev Admin',
      status: 'ACTIVE',
      locale: 'en',
      timezone: 'UTC',
    },
  });
  await prisma.userIdentity.upsert({
    where: {
      user_identities_provider_subject_unique: { identityProvider: 'SEED_IDP', externalSubject: 'seed-dev-admin-0001' },
    },
    update: { email: devUser.email, isPrimary: true },
    create: {
      userId: devUser.id,
      identityProvider: 'SEED_IDP',
      externalSubject: 'seed-dev-admin-0001',
      email: devUser.email,
      isPrimary: true,
    },
  });

  // --- Membership + role ----------------------------------------------
  const membership = await prisma.tenantMembership.upsert({
    where: { tenant_memberships_tenant_user_unique: { tenantId: tenant.id, userId: devUser.id } },
    update: { status: 'ACTIVE', joinedAt: NOW },
    create: { tenantId: tenant.id, userId: devUser.id, status: 'ACTIVE', joinedAt: NOW },
  });
  await prisma.membershipRole.upsert({
    where: { membership_roles_membership_role_unique: { membershipId: membership.id, roleId: tenantAdminRole.id } },
    update: {},
    create: { membershipId: membership.id, roleId: tenantAdminRole.id },
  });

  // --- TenantProduct ---------------------------------------------------
  const tenantProduct = await prisma.tenantProduct.upsert({
    where: { tenant_products_tenant_product_unique: { tenantId: tenant.id, productId: jioplix.id } },
    update: { planId: jioplixPlan.id, status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      productId: jioplix.id,
      planId: jioplixPlan.id,
      status: 'ACTIVE',
      activatedAt: NOW,
    },
  });

  // --- External mapping (product-specific tenant id) -------------------
  await prisma.tenantExternalIdentifier.upsert({
    where: {
      tenant_external_ids_tenant_product_provider_unique: { tenantId: tenant.id, productId: jioplix.id, provider: 'JIOPLIX_NEXUS' },
    },
    update: { externalId: 'acme-jioplix-0001' },
    create: {
      tenantId: tenant.id,
      productId: jioplix.id,
      provider: 'JIOPLIX_NEXUS',
      externalId: 'acme-jioplix-0001',
    },
  });

  // --- Managed database + schema (DEV shared pool, schema-per-tenant) --
  const database = await prisma.database.upsert({
    where: { databases_region_name_unique: { regionId: region.id, name: 'cybelinx_shared_pool_eu_west_1' } },
    update: { provider: 'postgres', endpoint: 'localhost', port: 5432, status: 'ACTIVE' },
    create: {
      name: 'cybelinx_shared_pool_eu_west_1',
      provider: 'postgres',
      endpoint: 'localhost',
      port: 5432,
      regionId: region.id,
      status: 'ACTIVE',
    },
  });
  const schema = await prisma.databaseSchema.upsert({
    where: {
      database_schemas_database_name_unique: { databaseId: database.id, schemaName: 'acme_jioplix' },
    },
    update: { regionId: region.id, environment: 'DEVELOPMENT', status: 'ACTIVE', migrationVersion: '1.0.0' },
    create: {
      databaseId: database.id,
      regionId: region.id,
      schemaName: 'acme_jioplix',
      environment: 'DEVELOPMENT',
      status: 'ACTIVE',
      migrationVersion: '1.0.0',
    },
  });

  // --- TenantResource (recipe of the physical workspace) ---------------
  const tenantResource = await prisma.tenantResource.upsert({
    where: {
      tenant_resources_tenant_product_env_resource_unique: {
        tenantId: tenant.id,
        productId: jioplix.id,
        environment: 'DEVELOPMENT',
        resourceId: schemaResource.id,
      },
    },
    update: {
      isolationMode: 'SCHEMA_PER_TENANT',
      databaseId: database.id,
      schemaId: schema.id,
      schemaName: schema.schemaName,
      regionId: region.id,
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
      migrationVersion: '1.0.0',
    },
    create: {
      tenantId: tenant.id,
      productId: jioplix.id,
      tenantProductId: tenantProduct.id,
      resourceId: schemaResource.id,
      isolationMode: 'SCHEMA_PER_TENANT',
      databaseId: database.id,
      schemaId: schema.id,
      schemaName: schema.schemaName,
      regionId: region.id,
      environment: 'DEVELOPMENT',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
      migrationVersion: '1.0.0',
      // vault-style reference ONLY — never a real credential
      credentialReference: 'vault://dev/tenants/acme/products/jioplix/development/app',
    },
  });

  // --- Provisioning job + steps illustrating the flow ------------------
  const existingJob = await prisma.provisioningJob.findFirst({
    where: { tenantId: tenant.id, operation: 'PROVISION', tenantProductId: tenantProduct.id },
  });
  const job =
    existingJob ??
    (await prisma.provisioningJob.create({
      data: {
        tenantId: tenant.id,
        tenantProductId: tenantProduct.id,
        tenantResourceId: tenantResource.id,
        operation: 'PROVISION',
        state: 'SUCCEEDED',
        progress: 100,
        requestedById: devUser.id,
        queuedAt: NOW,
        startedAt: NOW,
        finishedAt: NOW,
        steps: {
          create: [
            { sequence: 1, name: 'create_schema', status: 'SUCCEEDED', startedAt: NOW, finishedAt: NOW },
            { sequence: 2, name: 'grant_privileges', status: 'SUCCEEDED', startedAt: NOW, finishedAt: NOW },
            { sequence: 3, name: 'record_migration_version', status: 'SUCCEEDED', startedAt: NOW, finishedAt: NOW },
          ],
        },
      },
    }));

  if (!existingJob) {
    console.log(`[seed] provisioning job created: ${job.id}`);
  }

  // --- Audit trail -----------------------------------------------------
  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      productId: jioplix.id,
      userId: devUser.id,
      actorType: 'USER',
      action: 'tenant.resource.provisioned',
      entityType: 'tenant_resource',
      entityId: tenantResource.id,
      metadata: { isolationMode: 'SCHEMA_PER_TENANT', environment: 'DEVELOPMENT' },
      occurredAt: NOW,
    },
  });

  console.log(`[seed] test tenant OK: ${tenant.tenantCode} (${tenant.id})`);
}

async function main(): Promise<void> {
  await seedReferenceData();
  await seedProductCatalog();
  await seedTestTenant();
  console.log('[seed] complete ✔');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('[seed] FAILED:', error);
    await prisma.$disconnect();
    process.exit(1);
  });