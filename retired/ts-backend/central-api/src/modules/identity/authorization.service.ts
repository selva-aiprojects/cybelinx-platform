import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlatformAccess {
  tenantId: string;
  membershipId: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccess(userId: string): Promise<PlatformAccess[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        memberRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => {
      const roles = Array.from(
        new Set(membership.memberRoles.flatMap((grant) => (grant.role ? [grant.role.code] : []))),
      );
      const permissions = Array.from(
        new Set(
          membership.memberRoles.flatMap((grant) =>
            grant.role ? grant.role.rolePermissions.map((granted) => granted.permission.code) : [],
          ),
        ),
      );
      return { tenantId: membership.tenantId, membershipId: membership.id, roles, permissions };
    });
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const access = await this.listAccess(userId);
    return access.some((entry) => entry.roles.includes('CYBELINX_PLATFORM_ADMIN'));
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const access = await this.listAccess(userId);
    return access.some(
      (entry) => entry.roles.includes('CYBELINX_PLATFORM_ADMIN') || entry.permissions.includes(permission),
    );
  }
}