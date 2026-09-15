import { computeTenantSchemaName, createContextFromClaims, getSearchPathSql } from '../src';

describe('Cybelinx SDK Tenant Context & Schema Resolution', () => {
  it('should compute safe schema names for tenants and products', () => {
    expect(computeTenantSchemaName('NIKE', 'STOREAI')).toBe('tenant_nike_storeai');
    expect(computeTenantSchemaName('Acme-Corp 01', 'Jioplix')).toBe('tenant_acme_corp_01_jioplix');
  });

  it('should generate valid PostgreSQL search path SQL', () => {
    expect(getSearchPathSql('tenant_nike_storeai')).toBe('SET search_path TO tenant_nike_storeai, public;');
  });

  it('should create context and check entitlement and roles', () => {
    const ctx = createContextFromClaims({
      sub: 'user-123',
      email: 'merchant@nike.com',
      name: 'Nike Merchant',
      tenant_id: 't-001',
      tenant_code: 'NIKE',
      product_code: 'STOREAI',
      roles: ['TENANT_ADMIN'],
      entitlements: {
        CATALOG_MANAGEMENT: true,
        AI_RECOMMENDATIONS: 'ENABLED',
        MAX_STORES: 10,
      },
    });

    expect(ctx.tenantCode).toBe('NIKE');
    expect(ctx.schemaName).toBe('tenant_nike_storeai');
    expect(ctx.hasEntitlement('CATALOG_MANAGEMENT')).toBe(true);
    expect(ctx.hasEntitlement('AI_RECOMMENDATIONS')).toBe(true);
    expect(ctx.hasRole('TENANT_ADMIN')).toBe(true);
    expect(ctx.hasRole('PLATFORM_ADMIN')).toBe(false);
  });

  it('should extract tenant code from Host header subdomain in middleware', () => {
    const { createCybelinxMiddleware } = require('../src');
    const middleware = createCybelinxMiddleware({ productCode: 'STOREAI', allowAnonymous: false });

    const req: any = {
      headers: {
        host: 'omega-inc.storeai.cybelinx.com',
      },
    };
    const res: any = {};
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.cybelinxContext).toBeDefined();
    expect(req.cybelinxContext.tenantCode).toBe('OMEGA-INC');
    expect(req.cybelinxContext.schemaName).toBe('tenant_omega_inc_storeai');
  });
});
