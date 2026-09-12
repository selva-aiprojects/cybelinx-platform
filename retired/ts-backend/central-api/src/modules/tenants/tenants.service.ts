import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError, ErrorCode } from '@cybelinx/shared';
import { AuthorizationService } from '../identity/authorization.service';
import type { AuthPrincipal } from '../identity/identity-provider.adapter';
import { CreateTenantDto, TenantResourceRequestDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { parseSort, TenantListQueryDto } from './dto/tenant-list-query.dto';
import {
  CreateTenantResponse,
  ProvisioningJobView,
  TenantActionResponse,
  TenantDetailResponse,
  TenantListResponse,
  TenantProductView,
  TenantResourceView,
  TenantView,
} from './tenant.response';
import { PLATFORM_ADMIN_ROLE, TenantPermissions } from './tenant.constants';
import { applyTransition } from './tenant-status';
import { TenantsRepository } from './tenants.repository';

type DbClient = Prisma.TransactionClient | PrismaClient;

type TenantRecord = NonNullable<Awaited<ReturnType<TenantsRepository['findById']>>>;
type RoleRecord = NonNullable<Awaited<ReturnType<TenantsRepository['findRoleByCode']>>>;
type ProductRecord = Awaited<ReturnType<TenantsRepository['listProducts']>>[number];
type ResourceRecord = Awaited<ReturnType<TenantsRepository['listResources']>>[number];
type JobRecord = Awaited<ReturnType<TenantsRepository['listProvisioningJobs']>>[number];
type AuditRecord = Awaited<ReturnType<TenantsRepository['createAuditEvent']>>;

@Injectable()
export class TenantsService {
  constructor(
    private readonly repository: TenantsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async createTenant(principal: AuthPrincipal, dto: CreateTenantDto): Promise<CreateTenantResponse> {
    // 1. Validate caller permission — creating a tenant is a platform-wide privileged action.
    await this.assertPlatformPermission(principal.user.id, TenantPermissions.write);

    const outcome = await this.repository.transaction(async (tx) => {
      // 2. Create the canonical tenant.
      const regionId = await this.resolveRegionId(tx, dto.regionCode);
      const existing = await this.repository.findByTenantCode(tx, dto.tenantCode);
      if (existing) {
        throw new ApiError(
          ErrorCode.TENANT_CODE_TAKEN,
          `Tenant code "${dto.tenantCode}" is already taken`,
          undefined,
          { tenantCode: dto.tenantCode },
        );
      }
      const tenant = await this.repository.createTenant(tx, {
        tenantCode: dto.tenantCode,
        name: dto.name,
        status: 'PROVISIONING',
        regionId,
        country: dto.country,
        timezone: dto.timezone,
      });

      // 3. Create the initial membership (creator joins immediately).
      const membership = await this.repository.createTenantMembership(tx, {
        tenantId: tenant.id,
        userId: principal.user.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      // 4. Assign the platform administrator role.
      const role = await this.requireRole(tx, PLATFORM_ADMIN_ROLE);
      await this.repository.createMembershipRole(tx, { membershipId: membership.id, roleId: role.id });
      const permissionCodes = (
        await this.repository.findPermissionCodesForRole(tx, role.id)
      ).map((grant) => grant.permission.code);

      // 5. Create the requested product relationships (metadata only — no product business data).
      const { needsProvisioning, productRelationships } = await this.resolveProducts(tx, tenant.id, dto.products);

      // 6. Create provisioning jobs when resources are required.
      const provisioningJobs = await this.queueProvisioningJobs(tx, tenant.id, principal.user.id);

      // Everything active → go live; anything awaiting provisioning stays PROVISIONING.
      const finalStatus = needsProvisioning ? 'PROVISIONING' : 'ACTIVE';
      let activeTenant = tenant;
      if (finalStatus !== tenant.status) {
        activeTenant = await this.repository.updateTenant(tx, tenant.id, { status: finalStatus });
      }

      // 7. Write the audit event.
      await this.repository.createAuditEvent(tx, {
        tenantId: tenant.id,
        userId: principal.user.id,
        actorType: 'USER',
        action: 'tenant.created',
        entityType: 'tenant',
        entityId: tenant.id,
        metadata: toAuditProducts(dto.products),
        occurredAt: new Date(),
      });

      return { tenant: activeTenant, membership, roleCode: role.code, permissionCodes, provisioningJobs, productRelationships };
    });

    // 8. Return tenant context information.
    return {
      tenant: toTenantView(outcome.tenant),
      access: {
        userId: principal.user.id,
        tenantId: outcome.tenant.id,
        membershipId: outcome.membership.id,
        roles: [outcome.roleCode],
        permissions: outcome.permissionCodes,
      },
      products: outcome.productRelationships.map(toProductView),
      provisioningJobs: outcome.provisioningJobs.map(toJobView),
    };
  }

  async listTenants(principal: AuthPrincipal, query: TenantListQueryDto): Promise<TenantListResponse> {
    await this.assertPlatformPermission(principal.user.id, TenantPermissions.read);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildListWhere(query.status, query.search);
    const orderBy = buildSort(query.sort);

    const [total, rows] = await Promise.all([
      this.repository.count(this.repository.client, where),
      this.repository.findMany(this.repository.client, {
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => toTenantView(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getTenant(principal: AuthPrincipal, tenantId: string): Promise<TenantDetailResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.read);
    return this.composeDetail(tenantId);
  }

  async updateTenant(principal: AuthPrincipal, tenantId: string, dto: UpdateTenantDto): Promise<TenantDetailResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.write);

    await this.repository.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      const regionId =
        dto.regionCode !== undefined ? ((await this.resolveRegionId(tx, dto.regionCode)) ?? null) : tenant.regionId;

      await this.repository.updateTenant(tx, tenant.id, {
        name: dto.name,
        regionId,
        country: dto.country,
        timezone: dto.timezone,
      });
      await this.repository.createAuditEvent(tx, {
        tenantId: tenant.id,
        userId: principal.user.id,
        actorType: 'USER',
        action: 'tenant.updated',
        entityType: 'tenant',
        entityId: tenant.id,
        metadata: { fields: Object.keys(dto) },
        occurredAt: new Date(),
      });
    });

    return this.composeDetail(tenantId);
  }

  async suspendTenant(principal: AuthPrincipal, tenantId: string): Promise<TenantActionResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.write);

    const status = await this.repository.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      const next = applyTransition('suspend', tenant.status);
      await this.repository.updateTenant(tx, tenant.id, { status: next });
      await this.repository.updateTenantProducts(tx, tenant.id, 'SUSPENDED');
      await this.writeAudit(tx, principal, tenantId, 'tenant.suspended');
      return next;
    });

    return { tenantId, status };
  }

  async activateTenant(principal: AuthPrincipal, tenantId: string): Promise<TenantActionResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.write);

    const status = await this.repository.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      const next = applyTransition('activate', tenant.status);
      await this.repository.updateTenant(tx, tenant.id, { status: next });

      const suspended = (await this.repository.listProducts(tx, tenant.id)).filter((p) => p.status === 'SUSPENDED');
      await this.repository.updateTenantProducts(tx, tenant.id, 'ACTIVE');
      const now = new Date();
      for (const product of suspended) {
        if (!product.activatedAt) {
          await this.repository.updateTenantProduct(tx, product.id, { activatedAt: now });
        }
      }
      await this.writeAudit(tx, principal, tenantId, 'tenant.activated');
      return next;
    });

    return { tenantId, status };
  }

  async requestDeletion(principal: AuthPrincipal, tenantId: string): Promise<TenantActionResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.write);

    const status = await this.repository.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      const next = applyTransition('markDeletionPending', tenant.status);
      await this.repository.updateTenant(tx, tenant.id, { status: next });
      await this.writeAudit(tx, principal, tenantId, 'tenant.deletion_requested');
      return next;
    });

    return { tenantId, status };
  }

  async finalizeDeletion(principal: AuthPrincipal, tenantId: string): Promise<TenantActionResponse> {
    await this.assertCanManageTenant(principal, tenantId, TenantPermissions.write);

    const status = await this.repository.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      const next = applyTransition('finalizeDeletion', tenant.status);
      await this.repository.updateTenant(tx, tenant.id, { status: next });
      await this.repository.updateTenantProducts(tx, tenant.id, 'DISABLED');
      await this.writeAudit(tx, principal, tenantId, 'tenant.deletion_finalized');
      return next;
    });

    return { tenantId, status };
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async composeDetail(tenantId: string): Promise<TenantDetailResponse> {
    const tenant = await this.requireTenant(this.repository.client, tenantId);
    const client = this.repository.client;

    const [products, resources, jobs, memberships] = await Promise.all([
      this.repository.listProducts(client, tenant.id),
      this.repository.listResources(client, tenant.id),
      this.repository.listProvisioningJobs(client, tenant.id),
      this.repository.listMemberships(client, tenant.id),
    ]);

    return {
      tenant: toTenantView(tenant),
      products: products.map((product) => toProductView(product)),
      resources: resources.map((resource) => toResourceView(resource)),
      provisioningJobs: jobs.map(toJobView),
      memberships: memberships.map((m) => ({
        membershipId: m.id,
        tenantId: m.tenantId,
        userId: m.userId,
        status: m.status,
        roleCodes: m.memberRoles.map((grant) => grant.role.code),
        joinedAt: m.joinedAt?.toISOString() ?? null,
      })),
    };
  }

  private async assertPlatformPermission(userId: string, permission: string): Promise<void> {
    const access = await this.authorization.listAccess(userId);
    const granted = access.some(
      (entry) => entry.roles.includes(PLATFORM_ADMIN_ROLE) || entry.permissions.includes(permission),
    );
    if (!granted) {
      throw new ApiError(ErrorCode.FORBIDDEN, `Missing required permission: ${permission}`, undefined, {
        permission,
      });
    }
  }

  private async assertCanManageTenant(
    principal: AuthPrincipal,
    tenantId: string,
    permission: string,
  ): Promise<void> {
    const access = await this.authorization.listAccess(principal.user.id);
    const isPlatformAdmin = access.some((entry) => entry.roles.includes(PLATFORM_ADMIN_ROLE));
    if (isPlatformAdmin) {
      return;
    }
    const entry = access.find((e) => e.tenantId === tenantId);
    if (!entry || !entry.permissions.includes(permission)) {
      throw new ApiError(
        ErrorCode.TENANT_ACCESS_DENIED,
        `You do not have "${permission}" access on tenant "${tenantId}"`,
        undefined,
        { tenantId, permission },
      );
    }
  }

  private async resolveRegionId(client: DbClient, regionCode?: string): Promise<string | null> {
    if (!regionCode) {
      return null;
    }
    const region = await this.repository.findRegionByCode(client, regionCode);
    if (!region) {
      throw new ApiError(ErrorCode.REGION_NOT_FOUND, `Region "${regionCode}" is not registered`, undefined, {
        regionCode,
      });
    }
    return region.id;
  }

  private async requireRole(client: DbClient, code: string): Promise<RoleRecord> {
    const role = await this.repository.findRoleByCode(client, code);
    if (!role) {
      throw new ApiError(ErrorCode.INTERNAL_ERROR, `System role "${code}" is not seeded`);
    }
    return role;
  }

  private async requireTenant(client: DbClient, tenantId: string): Promise<TenantRecord> {
    const tenant = await this.repository.findById(client, tenantId);
    if (!tenant || tenant.status === 'DELETED') {
      throw new ApiError(ErrorCode.TENANT_NOT_FOUND, `Tenant "${tenantId}" does not exist`, undefined, {
        tenantId,
      });
    }
    return tenant;
  }

  private async resolveProducts(
    client: Prisma.TransactionClient,
    tenantId: string,
    products: CreateTenantDto['products'],
  ): Promise<{ needsProvisioning: boolean; productRelationships: ProductRecord[] }> {
    let needsProvisioning = false;
    const productRelationships: ProductRecord[] = [];
    for (const requested of products ?? []) {
      const product = await this.repository.findProductByCode(client, requested.productCode);
      if (!product) {
        throw new ApiError(ErrorCode.PRODUCT_NOT_FOUND, `Product "${requested.productCode}" is not registered`, undefined, {
          productCode: requested.productCode,
        });
      }
      const plan = requested.planCode
        ? await this.repository.findPlanByProductAndCode(client, product.id, requested.planCode)
        : await this.repository.findDefaultPlan(client, product.id);
      if (!plan) {
        throw new ApiError(
          ErrorCode.PLAN_NOT_FOUND,
          `No ${requested.planCode ? `plan "${requested.planCode}"` : 'default plan'} available for product "${requested.productCode}"`,
          undefined,
          { productCode: requested.productCode, planCode: requested.planCode ?? null },
        );
      }

      const requiresProvisioning = requested.resource !== undefined;
      const tenantProduct = await this.repository.createTenantProduct(client, {
        tenantId,
        productId: product.id,
        planId: plan.id,
        status: requiresProvisioning ? 'PROVISIONING' : 'ACTIVE',
        activatedAt: requiresProvisioning ? null : new Date(),
      });
      productRelationships.push({ ...tenantProduct, product, plan });

      if (requested.resource) {
        await this.resolveResource(client, tenantId, product.id, tenantProduct.id, requested.resource);
      }
      needsProvisioning = needsProvisioning || requiresProvisioning;
    }
    return { needsProvisioning, productRelationships };
  }

  private async resolveResource(
    client: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
    tenantProductId: string,
    resource: TenantResourceRequestDto,
  ): Promise<void> {
    const catalog = await this.repository.findResourceByTypeCode(client, resource.resourceTypeCode);
    if (!catalog) {
      throw new ApiError(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Resource type "${resource.resourceTypeCode}" is not registered`,
        undefined,
        { resourceTypeCode: resource.resourceTypeCode },
      );
    }
    await this.repository.createTenantResource(client, {
      tenantId,
      productId,
      tenantProductId,
      resourceId: catalog.id,
      isolationMode: resource.isolationMode ?? 'SHARED_POOL',
      environment: resource.environment ?? 'DEVELOPMENT',
      status: 'PROVISIONING',
      provisioningState: 'IN_PROGRESS',
    });
  }

  private async queueProvisioningJobs(
    client: Prisma.TransactionClient,
    tenantId: string,
    requestedById: string,
  ): Promise<JobRecord[]> {
    const resources = await this.repository.listResources(client, tenantId);
    const jobs: JobRecord[] = [];
    for (const resource of resources) {
      const job = await this.repository.createProvisioningJob(client, {
        tenantId,
        tenantProductId: resource.tenantProductId,
        tenantResourceId: resource.id,
        operation: 'PROVISION',
        state: 'IN_PROGRESS',
        progress: 10,
        requestedById,
        queuedAt: new Date(),
        startedAt: new Date(),
        steps: {
          create: [
            { sequence: 1, name: 'assign_workspace', status: 'IN_PROGRESS', startedAt: new Date() },
            { sequence: 2, name: 'verify_connectivity', status: 'PENDING' },
            { sequence: 3, name: 'finalize_credentials', status: 'PENDING' },
          ],
        },
      });
      jobs.push(job);
    }
    return jobs;
  }

  private writeAudit(
    client: Prisma.TransactionClient,
    principal: AuthPrincipal,
    tenantId: string,
    action: string,
  ): Promise<AuditRecord> {
    return this.repository.createAuditEvent(client, {
      tenantId,
      userId: principal.user.id,
      actorType: 'USER',
      action,
      entityType: 'tenant',
      entityId: tenantId,
      occurredAt: new Date(),
    });
  }
}

// ---------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------

const toTenantView = (tenant: TenantRecord): TenantView => ({
  tenantId: tenant.id,
  tenantCode: tenant.tenantCode,
  name: tenant.name,
  status: tenant.status,
  regionCode: tenant.region?.regionCode ?? null,
  country: tenant.country,
  timezone: tenant.timezone,
  createdAt: tenant.createdAt.toISOString(),
});

const toProductView = (product: ProductRecord): TenantProductView => ({
  tenantProductId: product.id,
  tenantId: product.tenantId,
  productCode: product.product?.productCode ?? '',
  planCode: product.plan?.planCode ?? '',
  status: product.status,
  activatedAt: product.activatedAt?.toISOString() ?? null,
});

const toResourceView = (resource: ResourceRecord): TenantResourceView => ({
  tenantResourceId: resource.id,
  tenantId: resource.tenantId,
  productCode: '',
  resourceTypeCode: resource.resource?.resourceTypeCode ?? '',
  isolationMode: resource.isolationMode,
  environment: resource.environment,
  status: resource.status,
  provisioningState: resource.provisioningState,
});

const toJobView = (job: JobRecord): ProvisioningJobView => ({
  jobId: job.id,
  tenantId: job.tenantId,
  operation: job.operation,
  state: job.state,
  progress: job.progress,
});

const toAuditProducts = (products: CreateTenantDto['products']): Prisma.InputJsonValue =>
  (products ?? []).map((p) => ({
    productCode: p.productCode,
    planCode: p.planCode ?? null,
    resource: p.resource
      ? {
          resourceTypeCode: p.resource.resourceTypeCode,
          isolationMode: p.resource.isolationMode ?? null,
          environment: p.resource.environment ?? null,
        }
      : null,
  }));

const buildListWhere = (status?: string, search?: string): Prisma.TenantWhereInput => ({
  ...(status ? { status: status as Prisma.TenantWhereInput['status'] } : {}),
  ...(search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { tenantCode: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}),
});

const buildSort = (sort: string | undefined): Prisma.TenantOrderByWithRelationInput[] =>
  parseSort(sort).map(({ key, direction }) => ({ [key]: direction }) as Prisma.TenantOrderByWithRelationInput);