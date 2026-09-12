import { ApiError, ErrorCode } from '@cybelinx/shared';
import { AuthorizationService } from '../../src/modules/identity/authorization.service';
import type { AuthPrincipal } from '../../src/modules/identity/identity-provider.adapter';
import { CreateTenantDto } from '../../src/modules/tenants/dto/create-tenant.dto';
import { TenantsRepository } from '../../src/modules/tenants/tenants.repository';
import { TenantsService } from '../../src/modules/tenants/tenants.service';

const PLATFORM_ADMIN = 'CYBELINX_PLATFORM_ADMIN';

interface TenantRow {
  id: string;
  tenantCode: string;
  name: string;
  status: string;
  regionId: string | null;
  country: string | null;
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Row {
  id: string;
  [key: string]: unknown;
}

interface FakeStores {
  tenants: TenantRow[];
  regions: Row[];
  products: Row[];
  plans: Row[];
  resources: Row[];
  permissions: Row[];
  roles: Row[];
  rolePermissions: Row[];
  tenantMemberships: Row[];
  membershipRoles: Row[];
  tenantProducts: Row[];
  tenantResources: Row[];
  provisioningJobs: Row[];
  provisioningSteps: Row[];
  auditEvents: Row[];
}

interface FakePrisma extends FakeStores {
  $transaction: jest.Mock;
  tenant: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
  region: { findUnique: jest.Mock };
  product: { findUnique: jest.Mock };
  plan: { findUnique: jest.Mock; findFirst: jest.Mock };
  resource: { findUnique: jest.Mock };
  role: { findUnique: jest.Mock };
  rolePermission: { findMany: jest.Mock };
  tenantMembership: { create: jest.Mock; findMany: jest.Mock };
  membershipRole: { create: jest.Mock };
  tenantProduct: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
  tenantResource: { create: jest.Mock; findMany: jest.Mock };
  provisioningJob: { create: jest.Mock; findMany: jest.Mock };
  auditEvent: { create: jest.Mock };
}

const now = () => new Date('2026-09-11T12:00:00.000Z');
const omitUndefined = (data: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
};

function createFakePrisma(): FakePrisma {
  const stores: FakeStores = {
    tenants: [],
    regions: [],
    products: [],
    plans: [],
    resources: [],
    permissions: [],
    roles: [],
    rolePermissions: [],
    tenantMemberships: [],
    membershipRoles: [],
    tenantProducts: [],
    tenantResources: [],
    provisioningJobs: [],
    provisioningSteps: [],
    auditEvents: [],
  };

  // Seed catalog (product registry, geography, RBAC).
  stores.regions.push({ id: 'reg-nigeria', regionCode: 'NG-WEST', name: 'Nigeria West', createdAt: now() });
  stores.products.push({ id: 'prod-jioplix', productCode: 'JIOPLIX', name: 'Jioplix', status: 'ACTIVE', createdAt: now() });
  stores.products.push({ id: 'prod-lims', productCode: 'LIMS', name: 'Lims', status: 'ACTIVE', createdAt: now() });
  stores.plans.push({ id: 'plan-jio-basic', productId: 'prod-jioplix', planCode: 'BASIC', name: 'Basic', status: 'ACTIVE', createdAt: now() });
  stores.plans.push({ id: 'plan-lims-core', productId: 'prod-lims', planCode: 'CORE', name: 'Core', status: 'ACTIVE', createdAt: now() });
  stores.resources.push({ id: 'res-pg-schema', resourceTypeCode: 'POSTGRES_SCHEMA', name: 'Postgres Schema', status: 'ACTIVE', createdAt: now() });

  const addPermission = (code: string): void => {
    const rec = { id: `perm-${code}`, code, name: code, module: 'tenant', createdAt: now() };
    stores.permissions.push(rec);
  };
  addPermission('tenant:read');
  addPermission('tenant:write');
  stores.roles.push({ id: 'role-platform-admin', code: PLATFORM_ADMIN, name: 'Platform Admin', scope: 'PLATFORM', isSystem: true, createdAt: now() });
  stores.roles.push({ id: 'role-tenant-admin', code: 'TENANT_ADMIN', name: 'Tenant Admin', scope: 'TENANT', isSystem: true, createdAt: now() });
  stores.rolePermissions.push({ id: 'rp-1', roleId: 'role-platform-admin', permissionId: 'perm-tenant:read', grantedAt: now() });
  stores.rolePermissions.push({ id: 'rp-2', roleId: 'role-platform-admin', permissionId: 'perm-tenant:write', grantedAt: now() });
  stores.rolePermissions.push({ id: 'rp-3', roleId: 'role-tenant-admin', permissionId: 'perm-tenant:read', grantedAt: now() });
  stores.rolePermissions.push({ id: 'rp-4', roleId: 'role-tenant-admin', permissionId: 'perm-tenant:write', grantedAt: now() });

  let seq = 0;
  const nuid = (prefix: string): string => `${prefix}-${++seq}`;
  const attachRegion = (rec: TenantRow): TenantRow & { region: Row | null } => ({
    ...rec,
    region: rec.regionId ? (stores.regions.find((r) => r.id === rec.regionId) ?? null) : null,
  });
  const getPermissions = (roleId: string) =>
    stores.rolePermissions
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => ({ permission: Object.fromEntries(Object.entries(stores.permissions.find((p) => p.id === rp.permissionId) ?? {})) }));
  const getMembershipRoles = (membershipId: string) =>
    stores.membershipRoles
      .filter((mr) => mr.membershipId === membershipId)
      .map((mr) => ({ ...mr, role: stores.roles.find((r) => r.id === mr.roleId) ?? null }));

  const matchTenant = (where: Record<string, unknown>) => (t: TenantRow) => {
    if (where.status && t.status !== where.status) return false;
    if (where.tenantCode && t.tenantCode !== where.tenantCode) return false;
    if (where.id && t.id !== where.id) return false;
    if (Array.isArray(where.OR)) {
      const matched = where.OR.some((clause) => {
        const or = clause as { name?: { contains: string; mode?: string }; tenantCode?: { contains: string; mode?: string } };
        if (or.name?.contains && t.name.toLowerCase().includes(or.name.contains.toLowerCase())) return true;
        if (or.tenantCode?.contains && t.tenantCode.toLowerCase().includes(or.tenantCode.contains.toLowerCase())) return true;
        return false;
      });
      if (!matched) return false;
    }
    return true;
  };

  const sortRows = <T>(rows: T[], orderBy?: unknown): T[] => {
    if (!Array.isArray(orderBy) || orderBy.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const clause of orderBy) {
        const [key, direction] = Object.entries(clause as Record<string, string>)[0];
        const av = (a as Record<string, unknown>)[key];
        const bv = (b as Record<string, unknown>)[key];
        if (av == null || bv == null || av === bv) continue;
        const sa = String(av);
        const sb = String(bv);
        if (sa === sb) continue;
        const cmp = sa < sb ? -1 : 1;
        return direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  };

  const fake: FakePrisma = {
    ...stores,
    $transaction: jest.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      const snapshot = structuredClone(stores);
      try {
        return await fn(fake);
      } catch (error) {
        for (const key of Object.keys(snapshot) as Array<keyof FakeStores>) {
          const stored = stores[key];
          if (Array.isArray(stored)) {
            (stored as unknown[]).splice(0, stored.length, ...(snapshot[key] as unknown[]));
          }
        }
        throw error;
      }
    }),

    tenant: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const rec = stores.tenants.find(matchTenant(where)) ?? null;
        if (!rec) return null;
        return attachRegion(rec);
      }),
      findMany: jest.fn(async ({ where, orderBy, skip = 0, take }: { where: Record<string, unknown>; orderBy?: Record<string, string>[]; skip?: number; take?: number }) => {
        const rows = sortRows(stores.tenants.filter(matchTenant(where)), orderBy);
        return rows.slice(skip, (skip ?? 0) + (take ?? rows.length)).map(attachRegion);
      }),
      count: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.tenants.filter(matchTenant(where)).length),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec: TenantRow = { id: nuid('ten'), ...(data as unknown as Omit<TenantRow, 'id'>), createdAt: now(), updatedAt: now() } as TenantRow;
        stores.tenants.push(rec);
        return attachRegion(rec);
      }),
      update: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rec = stores.tenants.find((t) => t.id === where.id);
        if (!rec) throw new Error('Tenant not found');
        Object.assign(rec, omitUndefined(data));
        rec.updatedAt = now();
        return attachRegion(rec);
      }),
    },

    region: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.regions.find((r) => r.regionCode === where.regionCode) ?? null),
    },

    product: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.products.find((p) => p.productCode === where.productCode) ?? null),
    },

    plan: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const key = where.plans_product_code_unique as { productId: string; planCode: string } | undefined;
        if (!key) return null;
        return stores.plans.find((p) => p.productId === key.productId && p.planCode === key.planCode) ?? null;
      }),
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.plans.find((p) => p.productId === where.productId && p.status === where.status) ?? null),
    },

    resource: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.resources.find((r) => r.resourceTypeCode === where.resourceTypeCode) ?? null),
    },

    role: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => stores.roles.find((r) => r.code === where.code) ?? null),
    },

    rolePermission: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => getPermissions(where.roleId as string)),
    },

    tenantMembership: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: nuid('mem'), ...(data as object), createdAt: now(), updatedAt: now() };
        stores.tenantMemberships.push(rec);
        return rec;
      }),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        stores.tenantMemberships
          .filter((m) => m.tenantId === where.tenantId)
          .map((m) => ({ ...m, memberRoles: getMembershipRoles(m.id as string) })),
      ),
    },

    membershipRole: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: nuid('mrole'), ...(data as object), grantedAt: now() };
        stores.membershipRoles.push(rec);
        return rec;
      }),
    },

    tenantProduct: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: nuid('tp'), ...(data as object), createdAt: now(), updatedAt: now() };
        stores.tenantProducts.push(rec);
        return rec;
      }),
      update: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rec = stores.tenantProducts.find((p) => p.id === where.id);
        if (!rec) throw new Error('TenantProduct not found');
        Object.assign(rec, omitUndefined(data));
        rec.updatedAt = now();
        return rec;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        stores.tenantProducts
          .filter((p) => p.tenantId === where.tenantId)
          .forEach((p) => Object.assign(p, omitUndefined(data)));
        return { count: 1 };
      }),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        stores.tenantProducts
          .filter((p) => p.tenantId === where.tenantId)
          .map((p) => ({ ...p, product: stores.products.find((x) => x.id === p.productId) ?? null, plan: stores.plans.find((x) => x.id === p.planId) ?? null })),
      ),
    },

    tenantResource: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: nuid('tr'), ...(data as object), createdAt: now(), updatedAt: now() };
        stores.tenantResources.push(rec);
        return rec;
      }),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        stores.tenantResources
          .filter((r) => r.tenantId === where.tenantId)
          .map((r) => ({ ...r, resource: stores.resources.find((x) => x.id === r.resourceId) ?? null })),
      ),
    },

    provisioningJob: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const steps = (data.steps as { create?: Record<string, unknown>[] } | undefined)?.create ?? [];
        const rec = { id: nuid('job'), ...omitUndefined({ ...(data as object), steps: undefined }), createdAt: now(), updatedAt: now() };
        stores.provisioningJobs.push(rec);
        let stepSeq = 0;
        for (const step of steps) {
          const stepRec = { id: nuid('step'), jobId: rec.id, sequence: ++stepSeq, ...step, createdAt: now(), updatedAt: now() };
          stores.provisioningSteps.push(stepRec);
        }
        return rec;
      }),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        stores.provisioningJobs.filter((j) => j.tenantId === where.tenantId),
      ),
    },

    auditEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: nuid('audit'), ...(data as object), createdAt: now(), occurredAt: now() };
        stores.auditEvents.push(rec);
        return rec;
      }),
    },
  };

  return fake;
}

function buildService(fakePrisma: ReturnType<typeof createFakePrisma>) {
  const repository = new TenantsRepository(fakePrisma as never);
  const authorization = { listAccess: jest.fn() } as unknown as AuthorizationService;
  return { service: new TenantsService(repository, authorization), authorization };
}

const principal: AuthPrincipal = {
  user: { id: 'usr-1', email: 'a@test.com', displayName: 'A', status: 'ACTIVE', locale: null, timezone: null },
  identity: { provider: 'test-idp', subject: 'sub-1', email: 'a@test.com', name: 'A' },
};

const platformAdminAccess = [
  {
    tenantId: 'ten-platform',
    membershipId: 'mem-platform',
    roles: [PLATFORM_ADMIN],
    permissions: ['tenant:read', 'tenant:write'],
  },
];

const tenantAdminAccess = [
  {
    tenantId: 'ten-target',
    membershipId: 'mem-target',
    roles: ['TENANT_ADMIN'],
    permissions: ['tenant:read', 'tenant:write'],
  },
];

const basicCreate: CreateTenantDto = {
  tenantCode: 'ACME_CORP',
  name: 'ACME Corp',
  regionCode: 'NG-WEST',
  country: 'NG',
  timezone: 'Africa/Lagos',
};

describe('TenantsService', () => {
  describe('createTenant', () => {
    it('creates tenant, membership, platform admin role, product relationship and audit (no business data)', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);

      const result = await service.createTenant(principal, {
        ...basicCreate,
        products: [{ productCode: 'JIOPLIX', planCode: 'BASIC' }],
      });

      expect(result.tenant.status).toBe('ACTIVE');
      expect(result.tenant.regionCode).toBe('NG-WEST');
      expect(result.access.roles).toEqual([PLATFORM_ADMIN]);
      expect(result.access.permissions).toContain('tenant:write');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productCode).toBe('JIOPLIX');
      expect(result.products[0].status).toBe('ACTIVE');
      expect(result.provisioningJobs).toHaveLength(0);

      // Platform state persisted.
      expect(fake.tenants).toHaveLength(1);
      expect(fake.tenantMemberships).toHaveLength(1);
      expect(fake.membershipRoles).toHaveLength(1);
      expect(fake.tenantProducts).toHaveLength(1);
      expect(fake.provisioningJobs).toHaveLength(0);
      // Creator joined immediately and got the platform admin role.
      expect(fake.tenantMemberships[0].userId).toBe('usr-1');
      expect(fake.membershipRoles[0].roleId).toBe('role-platform-admin');
      // Audit trail written.
      expect(fake.auditEvents).toHaveLength(1);
      expect(fake.auditEvents[0].action).toBe('tenant.created');
    });

    it('creates a provisioning job and keeps the tenant PROVISIONING when a resource is requested', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);

      const result = await service.createTenant(principal, {
        ...basicCreate,
        products: [
          {
            productCode: 'LIMS',
            planCode: 'CORE',
            resource: { resourceTypeCode: 'POSTGRES_SCHEMA', isolationMode: 'SCHEMA_PER_TENANT', environment: 'PRODUCTION' },
          },
        ],
      });

      expect(result.tenant.status).toBe('PROVISIONING');
      expect(result.products[0].status).toBe('PROVISIONING');
      expect(result.provisioningJobs).toHaveLength(1);
      expect(result.provisioningJobs[0].operation).toBe('PROVISION');
      expect(result.provisioningJobs[0].state).toBe('IN_PROGRESS');
      expect(fake.tenantResources).toHaveLength(1);
      expect(fake.tenantResources[0].isolationMode).toBe('SCHEMA_PER_TENANT');
      expect(fake.provisioningSteps.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects a duplicate tenant code and rolls back the whole transaction', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-existing', tenantCode: 'ACME_CORP', name: 'Old', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const call = service.createTenant(principal, basicCreate);

      await expect(call).rejects.toMatchObject({
        code: ErrorCode.TENANT_CODE_TAKEN,
        status: 409,
        details: { tenantCode: 'ACME_CORP' },
      });
      // No side effects persisted before the duplicate check.
      expect(fake.tenants).toHaveLength(1);
      expect(fake.tenantMemberships).toHaveLength(0);
      expect(fake.auditEvents).toHaveLength(0);
    });

    it('rejects an unregistered product', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);

      const call = service.createTenant(principal, { ...basicCreate, products: [{ productCode: 'JIOPLIX', planCode: 'NOPE' }] });

      await expect(call).rejects.toMatchObject({
        code: ErrorCode.PLAN_NOT_FOUND,
        status: 404,
        details: { productCode: 'JIOPLIX', planCode: 'NOPE' },
      });
      expect(fake.tenants).toHaveLength(0);
    });

    it('rejects an unknown region code', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);

      const call = service.createTenant(principal, { ...basicCreate, regionCode: 'NOPE' });

      await expect(call).rejects.toMatchObject({ code: ErrorCode.REGION_NOT_FOUND, status: 404 });
      expect(fake.tenants).toHaveLength(0);
    });

    it('rejects callers without the tenant:write permission', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue([]);

      const call = service.createTenant(principal, basicCreate);

      await expect(call).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN, status: 403 });
      expect(fake.tenants).toHaveLength(0);
    });
  });

  describe('authorization scoping', () => {
    it('allows a tenant admin to manage their own tenant', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(tenantAdminAccess);
      fake.tenants.push({ id: 'ten-target', tenantCode: 'TARGET', name: 'Target', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const detail = await service.getTenant(principal, 'ten-target');

      expect(detail.tenant.tenantId).toBe('ten-target');
    });

    it('denies a caller with no membership in the target tenant', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(tenantAdminAccess);
      fake.tenants.push({ id: 'ten-other', tenantCode: 'OTHER', name: 'Other', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const call = service.getTenant(principal, 'ten-other');

      await expect(call).rejects.toMatchObject({ code: ErrorCode.TENANT_ACCESS_DENIED, status: 403 });
    });

    it('lets a platform admin manage any tenant', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-other', tenantCode: 'OTHER', name: 'Other', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const detail = await service.getTenant(principal, 'ten-other');

      expect(detail.tenant.tenantCode).toBe('OTHER');
    });

    it('treats DELETED tenants as not found', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-gone', tenantCode: 'GONE', name: 'Gone', status: 'DELETED', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const call = service.getTenant(principal, 'ten-gone');

      await expect(call).rejects.toMatchObject({ code: ErrorCode.TENANT_NOT_FOUND, status: 404 });
    });
  });

  describe('lifecycle transitions', () => {
    it('suspends an active tenant and its products', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });
      fake.tenantProducts.push({ id: 'tp-1', tenantId: 'ten-1', productId: 'prod-jioplix', planId: 'plan-jio-basic', status: 'ACTIVE', activatedAt: now(), createdAt: now(), updatedAt: now() });

      const result = await service.suspendTenant(principal, 'ten-1');

      expect(result).toEqual({ tenantId: 'ten-1', status: 'SUSPENDED' });
      expect(fake.tenants[0].status).toBe('SUSPENDED');
      expect(fake.tenantProducts[0].status).toBe('SUSPENDED');
      expect(fake.auditEvents.some((e) => e.action === 'tenant.suspended')).toBe(true);
    });

    it('rejects suspending a tenant that is not active', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'PROVISIONING', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const call = service.suspendTenant(principal, 'ten-1');

      await expect(call).rejects.toMatchObject({ code: ErrorCode.TENANT_STATUS_TRANSITION_INVALID, status: 409 });
      expect(fake.tenants[0].status).toBe('PROVISIONING');
    });

    it('activates a suspended tenant', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'SUSPENDED', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });
      fake.tenantProducts.push({ id: 'tp-1', tenantId: 'ten-1', productId: 'prod-jioplix', planId: 'plan-jio-basic', status: 'SUSPENDED', activatedAt: null, createdAt: now(), updatedAt: now() });

      const result = await service.activateTenant(principal, 'ten-1');

      expect(result.status).toBe('ACTIVE');
      expect(fake.tenantProducts[0].status).toBe('ACTIVE');
      expect(fake.tenantProducts[0].activatedAt).toBeInstanceOf(Date);
    });

    it('runs a deferred (soft) deletion lifecycle without removing the row', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const pending = await service.requestDeletion(principal, 'ten-1');
      expect(pending.status).toBe('DELETION_PENDING');
      expect(fake.tenants).toHaveLength(1);

      const finalized = await service.finalizeDeletion(principal, 'ten-1');
      expect(finalized.status).toBe('DELETED');
      expect(fake.tenants).toHaveLength(1);
      expect(fake.tenants[0].status).toBe('DELETED');
      expect(fake.auditEvents.some((e) => e.action === 'tenant.deletion_finalized')).toBe(true);
    });
  });

  describe('updateTenant', () => {
    it('updates profile fields and writes an audit event', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      await service.updateTenant(principal, 'ten-1', { name: 'Number One', timezone: 'UTC' });

      expect(fake.tenants[0].name).toBe('Number One');
      expect(fake.tenants[0].timezone).toBe('UTC');
      expect(fake.auditEvents.some((e) => e.action === 'tenant.updated')).toBe(true);
    });
  });

  describe('listTenants', () => {
    it('returns pagination metadata and tenant rows', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ACME_ONE', name: 'ACME One', status: 'ACTIVE', regionId: 'reg-nigeria', country: 'NG', timezone: null, createdAt: now(), updatedAt: now() });
      fake.tenants.push({ id: 'ten-2', tenantCode: 'ACME_TWO', name: 'ACME Two', status: 'SUSPENDED', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });
      fake.tenants.push({ id: 'ten-3', tenantCode: 'ZZZ', name: 'Zulu', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const result = await service.listTenants(principal, { page: 1, limit: 2, search: 'acme' });

      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data.map((t) => t.tenantCode)).toEqual(['ACME_ONE', 'ACME_TWO']);
      expect(result.data[0].regionCode).toBe('NG-WEST');
    });

    it('respects status filtering', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);
      fake.tenants.push({ id: 'ten-1', tenantCode: 'ONE', name: 'One', status: 'ACTIVE', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });
      fake.tenants.push({ id: 'ten-2', tenantCode: 'TWO', name: 'Two', status: 'SUSPENDED', regionId: null, country: null, timezone: null, createdAt: now(), updatedAt: now() });

      const result = await service.listTenants(principal, { page: 1, limit: 20, status: 'SUSPENDED' });

      expect(result.meta.total).toBe(1);
      expect(result.data[0].tenantCode).toBe('TWO');
    });

    it('requires tenant:read permission', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue([]);

      const call = service.listTenants(principal, { page: 1, limit: 20 });

      await expect(call).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    });
  });

  describe('input contract', () => {
    it('does not accept a tenant_id/tenantId field from the request body', () => {
      const dto = new CreateTenantDto();
      expect(Object.keys(dto as object)).not.toContain('tenantId');
      expect(Object.keys(dto as object)).not.toContain('tenant_id');
    });

    it('keeps business data out of the platform (only relationship rows are written)', async () => {
      const fake = createFakePrisma();
      const { service, authorization } = buildService(fake);
      (authorization.listAccess as jest.Mock).mockResolvedValue(platformAdminAccess);

      await service.createTenant(principal, { ...basicCreate, products: [{ productCode: 'JIOPLIX' }] });

      const writtenCollections = {
        tenantProducts: fake.tenantProducts.length,
        tenantResources: fake.tenantResources.length,
        provisioningJobs: fake.provisioningJobs.length,
      };
      expect(writtenCollections).toEqual({ tenantProducts: 1, tenantResources: 0, provisioningJobs: 0 });
    });
  });

  it('exposes catchable ApiError instances', async () => {
    const fake = createFakePrisma();
    const { service, authorization } = buildService(fake);
    (authorization.listAccess as jest.Mock).mockResolvedValue([]);

    await expect(service.createTenant(principal, basicCreate)).rejects.toBeInstanceOf(ApiError);
  });
});