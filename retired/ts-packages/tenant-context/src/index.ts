import { z } from 'zod';

export const TenantContextSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  productId: z.string().min(1),
  membershipId: z.string().min(1),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;

export const buildTenantContext = (input: unknown): TenantContext => TenantContextSchema.parse(input);

export const isTenantContext = (input: unknown): input is TenantContext =>
  TenantContextSchema.safeParse(input).success;

export const hasPermission = (context: TenantContext, permission: string): boolean =>
  context.permissions.includes(permission) || context.roles.includes('CYBELINX_PLATFORM_ADMIN');