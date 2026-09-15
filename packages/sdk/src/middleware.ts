import type { CybelinxClaims, CybelinxSdkConfig, CybelinxTenantContext } from './types';
import { createContextFromClaims } from './context-builder';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      cybelinxContext?: CybelinxTenantContext;
    }
  }
}

/**
 * Standard Node.js Express/Connect middleware for Cybelinx Multi-Tenant product apps.
 */
export function createCybelinxMiddleware(config: CybelinxSdkConfig) {
  return (req: any, res: any, next: (err?: any) => void) => {
    try {
      const authHeader = req.headers.authorization || req.headers['x-cybelinx-jwt'];
      const tenantHeader = req.headers['x-cybelinx-tenant-id'] || req.headers['x-tenant-id'];
      const tenantCodeHeader = req.headers['x-cybelinx-tenant-code'] || req.headers['x-tenant-code'];

      // If gateway injected claims header or bearer token exists
      let claims: Partial<CybelinxClaims> = {};

      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
            claims = JSON.parse(payloadJson);
          }
        } catch {
          // Token decode fallback
        }
      }

      // Merge header overrides if provided by Edge Gateway
      if (tenantHeader && typeof tenantHeader === 'string') claims.tenant_id = tenantHeader;
      if (tenantCodeHeader && typeof tenantCodeHeader === 'string') claims.tenant_code = tenantCodeHeader;
      claims.product_code = claims.product_code || config.productCode;

      if (!claims.tenant_id && !claims.tenant_code) {
        if (config.allowAnonymous) {
          req.cybelinxContext = createContextFromClaims({
            sub: 'anon',
            email: 'anon@guest.local',
            tenant_id: '00000000-0000-0000-0000-000000000000',
            tenant_code: 'PUBLIC',
            product_code: config.productCode,
          });
          return next();
        }
        return res.status(401).json({
          statusCode: 401,
          message: 'Missing valid Cybelinx tenant authentication token or tenant headers',
          code: 'TENANT_UNAUTHENTICATED',
        });
      }

      const context = createContextFromClaims(claims as CybelinxClaims);
      req.cybelinxContext = context;
      return next();
    } catch (err: any) {
      return res.status(400).json({
        statusCode: 400,
        message: err.message || 'Failed to resolve Cybelinx tenant context',
        code: 'INVALID_TENANT_CONTEXT',
      });
    }
  };
}
