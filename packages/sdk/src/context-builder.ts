import type { CybelinxClaims, CybelinxTenantContext } from './types';
import { computeTenantSchemaName } from './schema-resolver';

export function createContextFromClaims(claims: CybelinxClaims): CybelinxTenantContext {
  const tenantId = claims.tenant_id || '';
  const tenantCode = (claims.tenant_code || 'default').toUpperCase();
  const productCode = (claims.product_code || 'app').toUpperCase();
  const schemaName = computeTenantSchemaName(tenantCode, productCode);
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  const entitlements = claims.entitlements || {};

  return {
    tenantId,
    tenantCode,
    productCode,
    schemaName,
    userId: claims.sub || 'anonymous',
    userEmail: claims.email || '',
    userName: claims.name || claims.email || 'User',
    roles,
    entitlements,
    hasEntitlement: (key: string): boolean => {
      const val = entitlements[key];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toUpperCase() === 'ENABLED' || val.toUpperCase() === 'TRUE';
      return Boolean(val);
    },
    hasRole: (roleCode: string): boolean => {
      return roles.includes(roleCode) || roles.includes('CYBELINX_PLATFORM_ADMIN');
    },
  };
}
