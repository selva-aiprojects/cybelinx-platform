import { TenantContextSchema, buildTenantContext, hasPermission, isTenantContext } from '../src';

describe('@cybelinx/tenant-context', () => {
  const shape = {
    userId: 'u1',
    tenantId: 't1',
    productId: 'JIOPLIX',
    membershipId: 'm1',
  };

  it('builds a tenant context and applies default roles/permissions', () => {
    const context = buildTenantContext(shape);
    expect(context.roles).toEqual([]);
    expect(context.permissions).toEqual([]);
    expect(isTenantContext(context)).toBe(true);
  });

  it('rejects malformed tenant contexts', () => {
    expect(() => buildTenantContext({ userId: 'u1' })).toThrow();
    expect(isTenantContext({ userId: '', tenantId: 't1', productId: 'x', membershipId: 'm' })).toBe(false);
    expect(TenantContextSchema.parse({ ...shape, roles: ['TENANT_ADMIN'] }).roles).toEqual(['TENANT_ADMIN']);
  });

  it('checks permissions with platform admin override', () => {
    const user = buildTenantContext({ ...shape, permissions: ['tenant:read'] });
    expect(hasPermission(user, 'tenant:read')).toBe(true);
    expect(hasPermission(user, 'tenant:write')).toBe(false);
    const admin = buildTenantContext({ ...shape, roles: ['CYBELINX_PLATFORM_ADMIN'] });
    expect(hasPermission(admin, 'anything')).toBe(true);
  });
});