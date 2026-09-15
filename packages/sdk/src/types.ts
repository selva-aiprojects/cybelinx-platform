export interface CybelinxClaims {
  sub: string;
  email: string;
  name?: string;
  tenant_id: string;
  tenant_code: string;
  product_code: string;
  roles?: string[];
  entitlements?: Record<string, boolean | number | string>;
  iss?: string;
  aud?: string;
  exp?: number;
}

export interface CybelinxTenantContext {
  tenantId: string;
  tenantCode: string;
  productCode: string;
  schemaName: string;
  userId: string;
  userEmail: string;
  userName: string;
  roles: string[];
  entitlements: Record<string, boolean | number | string>;
  hasEntitlement: (key: string) => boolean;
  hasRole: (roleCode: string) => boolean;
}

export interface CybelinxSdkConfig {
  productCode: string;
  centralApiUrl?: string;
  jwksUrl?: string;
  allowAnonymous?: boolean;
}
