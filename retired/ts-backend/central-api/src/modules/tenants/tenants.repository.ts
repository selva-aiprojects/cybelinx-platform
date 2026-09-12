import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type DbClient = PrismaClient | Prisma.TransactionClient;

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaClient {
    return this.prisma;
  }

  transaction<T>(fn: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findById(client: DbClient, tenantId: string) {
    return client.tenant.findUnique({
      where: { id: tenantId },
      include: { region: true },
    });
  }

  findByTenantCode(client: DbClient, tenantCode: string) {
    return client.tenant.findUnique({ where: { tenantCode } });
  }

  count(client: DbClient, where: Prisma.TenantWhereInput): Promise<number> {
    return client.tenant.count({ where });
  }

  findMany(
    client: DbClient,
    args: {
      where: Prisma.TenantWhereInput;
      orderBy: Prisma.TenantOrderByWithRelationInput[];
      skip: number;
      take: number;
    },
  ) {
    return client.tenant.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      include: { region: true },
    });
  }

  createTenant(client: DbClient, data: Prisma.TenantUncheckedCreateInput) {
    return client.tenant.create({ data, include: { region: true } });
  }

  updateTenant(client: DbClient, tenantId: string, data: Prisma.TenantUncheckedUpdateInput) {
    return client.tenant.update({ where: { id: tenantId }, data, include: { region: true } });
  }

  findRegionByCode(client: DbClient, regionCode: string) {
    return client.region.findUnique({ where: { regionCode } });
  }

  findProductByCode(client: DbClient, productCode: string) {
    return client.product.findUnique({ where: { productCode } });
  }

  findPlanByProductAndCode(client: DbClient, productId: string, planCode: string) {
    return client.plan.findUnique({
      where: { plans_product_code_unique: { productId, planCode } },
    });
  }

  findDefaultPlan(client: DbClient, productId: string) {
    return client.plan.findFirst({
      where: { productId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
  }

  findResourceByTypeCode(client: DbClient, resourceTypeCode: string) {
    return client.resource.findUnique({ where: { resourceTypeCode } });
  }

  findRoleByCode(client: DbClient, code: string) {
    return client.role.findUnique({ where: { code } });
  }

  findPermissionCodesForRole(client: DbClient, roleId: string) {
    return client.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { code: true } } },
    });
  }

  createTenantMembership(client: DbClient, data: Prisma.TenantMembershipUncheckedCreateInput) {
    return client.tenantMembership.create({ data });
  }

  createMembershipRole(client: DbClient, data: Prisma.MembershipRoleUncheckedCreateInput) {
    return client.membershipRole.create({ data });
  }

  createTenantProduct(client: DbClient, data: Prisma.TenantProductUncheckedCreateInput) {
    return client.tenantProduct.create({ data });
  }

  createTenantResource(client: DbClient, data: Prisma.TenantResourceUncheckedCreateInput) {
    return client.tenantResource.create({ data });
  }

  createProvisioningJob(
    client: DbClient,
    data: Prisma.ProvisioningJobUncheckedCreateInput & {
      steps?: Prisma.ProvisioningStepCreateNestedManyWithoutJobInput;
    },
  ) {
    return client.provisioningJob.create({ data });
  }

  createAuditEvent(client: DbClient, data: Prisma.AuditEventUncheckedCreateInput) {
    return client.auditEvent.create({ data });
  }

  updateTenantProducts(
    client: DbClient,
    tenantId: string,
    status: Prisma.TenantProductUpdateManyMutationInput['status'],
  ): Promise<{ count: number }> {
    return client.tenantProduct.updateMany({ where: { tenantId }, data: { status } });
  }

  updateTenantProduct(
    client: DbClient,
    tenantProductId: string,
    data: Prisma.TenantProductUpdateManyMutationInput,
  ) {
    return client.tenantProduct.update({ where: { id: tenantProductId }, data });
  }

  listProducts(client: DbClient, tenantId: string) {
    return client.tenantProduct.findMany({
      where: { tenantId },
      include: { product: true, plan: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listResources(client: DbClient, tenantId: string) {
    return client.tenantResource.findMany({
      where: { tenantId },
      include: { resource: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listProvisioningJobs(client: DbClient, tenantId: string) {
    return client.provisioningJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMemberships(client: DbClient, tenantId: string) {
    return client.tenantMembership.findMany({
      where: { tenantId },
      include: {
        memberRoles: { include: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}