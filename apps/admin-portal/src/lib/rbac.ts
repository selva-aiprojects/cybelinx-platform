import type { User } from '@supabase/supabase-js';

export interface TenantContext {
  tenantCode: string;
  tenantId: string;
  name: string;
  storeDomain: string;
  externalId: string;
  demoSchema: string;
  prodSchema: string;
  adminEmail: string;
}

export const STOREAI_TENANTS: Record<string, TenantContext> = {
  STOREAI_NIKE_01: {
    tenantCode: 'STOREAI_NIKE_01',
    tenantId: '00000000-0000-0000-0000-000000000c11',
    name: 'Nike Flagship Store',
    storeDomain: 'https://nike.storeai.cybelinx.com',
    externalId: 'STOREAI_NEXUS_RETAIL_01',
    demoSchema: 'tenant_demo_storeai_nike_db',
    prodSchema: 'tenant_prod_storeai_nike_db',
    adminEmail: 'demo.nike@cybelinx.com',
  },
  STOREAI_ADIDAS_01: {
    tenantCode: 'STOREAI_ADIDAS_01',
    tenantId: '00000000-0000-0000-0000-000000000c12',
    name: 'Adidas Sportswear Store',
    storeDomain: 'https://adidas.storeai.cybelinx.com',
    externalId: 'STOREAI_NEXUS_02',
    demoSchema: 'tenant_demo_storeai_adidas_db',
    prodSchema: 'tenant_prod_storeai_adidas_db',
    adminEmail: 'demo.adidas@cybelinx.com',
  },
  STOREAI_PUMA_01: {
    tenantCode: 'STOREAI_PUMA_01',
    tenantId: '00000000-0000-0000-0000-000000000c13',
    name: 'Puma Retail Store',
    storeDomain: 'https://puma.storeai.cybelinx.com',
    externalId: 'STOREAI_NEXUS_03',
    demoSchema: 'tenant_demo_storeai_puma_db',
    prodSchema: 'tenant_prod_storeai_puma_db',
    adminEmail: 'demo.puma@cybelinx.com',
  },
};

export interface UserTenantMembership {
  tenantCode: string;
  role: string;
}

export interface UserSecurityProfile {
  userId: string;
  email: string;
  displayName: string;
  isPlatformAdmin: boolean;
  memberships: UserTenantMembership[];
  globalRoles: string[];
}

export interface RbacEvaluationResult {
  authorized: boolean;
  userRole?: string;
  isPlatformAdmin: boolean;
  grantedPermissions: string[];
  reason?: string;
}

/**
 * Resolves the target tenant metadata based on hostname or query parameter.
 */
export function resolveTenantFromHostOrQuery(
  hostname: string,
  searchParamTenant?: string | null
): TenantContext {
  const normParam = (searchParamTenant || '').toUpperCase().trim();
  if (normParam) {
    if (STOREAI_TENANTS[normParam]) return STOREAI_TENANTS[normParam];
    if (normParam.includes('NIKE')) return STOREAI_TENANTS.STOREAI_NIKE_01;
    if (normParam.includes('ADIDAS')) return STOREAI_TENANTS.STOREAI_ADIDAS_01;
    if (normParam.includes('PUMA')) return STOREAI_TENANTS.STOREAI_PUMA_01;
  }

  const hostLower = (hostname || '').toLowerCase();
  if (hostLower.includes('adidas')) return STOREAI_TENANTS.STOREAI_ADIDAS_01;
  if (hostLower.includes('puma')) return STOREAI_TENANTS.STOREAI_PUMA_01;
  
  // Default to Nike Flagship Store for nike.storeai.* or default merchant view
  return STOREAI_TENANTS.STOREAI_NIKE_01;
}

/**
 * Safely decodes JWT payload string without external dependencies.
 */

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Parses user security profile from active Supabase user or JWT token.
 */
export function parseUserSecurityProfile(
  token: string | null,
  supabaseUser: User | null
): UserSecurityProfile | null {
  let email = supabaseUser?.email || '';
  let userId = supabaseUser?.id || '';
  let claimsRoles: string[] = [];
  let claimsTenantCode: string | null = null;

  if (token) {
    const claims = decodeJwtClaims(token);
    if (claims) {
      if (!email && typeof claims.email === 'string') email = claims.email;
      if (!userId && typeof claims.sub === 'string') userId = claims.sub;
      if (Array.isArray(claims.roles)) {
        claimsRoles = claims.roles.map(String);
      }
      if (typeof claims.tenant_code === 'string') {
        claimsTenantCode = claims.tenant_code;
      }
    }
  }

  if (!email && !userId) return null;

  const emailLower = email.toLowerCase();

  // 1. Platform Admin Users
  if (
    emailLower === 'storeai.admin@cybelinx.com' ||
    emailLower === 'dev.admin@cybelinx.test' ||
    claimsRoles.includes('CYBELINX_PLATFORM_ADMIN') ||
    claimsRoles.includes('STOREAI_PLATFORM_ADMIN')
  ) {
    return {
      userId: userId || '00000000-0000-0000-0000-000000000a10',
      email: email || 'storeai.admin@cybelinx.com',
      displayName: 'StoreAI Platform Administrator',
      isPlatformAdmin: true,
      globalRoles: ['CYBELINX_PLATFORM_ADMIN', 'STOREAI_PLATFORM_ADMIN'],
      memberships: [
        { tenantCode: 'STOREAI_NIKE_01', role: 'TENANT_ADMIN' },
        { tenantCode: 'STOREAI_ADIDAS_01', role: 'TENANT_ADMIN' },
        { tenantCode: 'STOREAI_PUMA_01', role: 'TENANT_ADMIN' },
      ],
    };
  }

  // 2. Nike Merchant Admin User (from V16 migration)
  if (emailLower === 'demo.nike@cybelinx.com' || claimsTenantCode === 'STOREAI_NIKE_01') {
    return {
      userId: userId || '00000000-0000-0000-0000-000000000a11',
      email: email || 'demo.nike@cybelinx.com',
      displayName: 'Nike Store Merchant Admin',
      isPlatformAdmin: false,
      globalRoles: ['TENANT_ADMIN'],
      memberships: [{ tenantCode: 'STOREAI_NIKE_01', role: 'TENANT_ADMIN' }],
    };
  }

  // 3. Adidas Merchant Admin User (from V16 migration)
  if (emailLower === 'demo.adidas@cybelinx.com' || claimsTenantCode === 'STOREAI_ADIDAS_01') {
    return {
      userId: userId || '00000000-0000-0000-0000-000000000a12',
      email: email || 'demo.adidas@cybelinx.com',
      displayName: 'Adidas Store Merchant Admin',
      isPlatformAdmin: false,
      globalRoles: ['TENANT_ADMIN'],
      memberships: [{ tenantCode: 'STOREAI_ADIDAS_01', role: 'TENANT_ADMIN' }],
    };
  }

  // 4. Puma Merchant Admin User (from V16 migration)
  if (emailLower === 'demo.puma@cybelinx.com' || claimsTenantCode === 'STOREAI_PUMA_01') {
    return {
      userId: userId || '00000000-0000-0000-0000-000000000a13',
      email: email || 'demo.puma@cybelinx.com',
      displayName: 'Puma Store Merchant Admin',
      isPlatformAdmin: false,
      globalRoles: ['TENANT_ADMIN'],
      memberships: [{ tenantCode: 'STOREAI_PUMA_01', role: 'TENANT_ADMIN' }],
    };
  }

  // 5. Generic authenticated user
  return {
    userId: userId || 'user-anon',
    email: email || 'user@merchant.com',
    displayName: email.split('@')[0] || 'Merchant User',
    isPlatformAdmin: false,
    globalRoles: claimsRoles.length ? claimsRoles : ['TENANT_MEMBER'],
    memberships: claimsTenantCode
      ? [{ tenantCode: claimsTenantCode, role: 'TENANT_MEMBER' }]
      : [],
  };
}

/**
 * Evaluates Role-Based Access Control (RBAC) permissions for a user against a target tenant.
 */
export function evaluateTenantRbac(
  profile: UserSecurityProfile | null,
  targetTenantCode: string
): RbacEvaluationResult {
  if (!profile) {
    return {
      authorized: false,
      isPlatformAdmin: false,
      grantedPermissions: [],
      reason: 'Authentication required. Please sign in to access merchant dashboard.',
    };
  }

  if (profile.isPlatformAdmin) {
    return {
      authorized: true,
      userRole: 'PLATFORM_ADMIN',
      isPlatformAdmin: true,
      grantedPermissions: [
        'TENANT_READ',
        'TENANT_WRITE',
        'SCHEMA_MANAGE',
        'CATALOG_MANAGE',
        'ORDERS_READ',
        'OUTBOX_READ',
        'ENTITLEMENTS_MANAGE',
        'IAM_ROLES_GRANT',
      ],
    };
  }

  const membership = profile.memberships.find(
    (m) => m.tenantCode.toUpperCase() === targetTenantCode.toUpperCase()
  );

  if (membership) {
    return {
      authorized: true,
      userRole: membership.role,
      isPlatformAdmin: false,
      grantedPermissions: [
        'STORE_READ',
        'STORE_WRITE',
        'CATALOG_MANAGE',
        'ORDERS_READ',
        'OUTBOX_READ',
        'ENTITLEMENTS_READ',
      ],
    };
  }

  return {
    authorized: false,
    isPlatformAdmin: false,
    grantedPermissions: [],
    reason: `RBAC Authorization Violation: User '${profile.email}' does not hold TENANT_ADMIN or active membership permissions for tenant code '${targetTenantCode}'.`,
  };
}
