/**
  * Resolves the PostgreSQL schema isolation name for a given tenant and product.
  */
export function computeTenantSchemaName(tenantCode: string, productCode: string): string {
  const cleanTenant = tenantCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const cleanProduct = productCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `tenant_${cleanTenant}_${cleanProduct}`;
}

/**
 * Returns the SQL command to set PostgreSQL search path for schema isolation.
 */
export function getSearchPathSql(schemaName: string): string {
  const safeSchema = schemaName.replace(/[^a-z0-9_]/gi, '');
  return `SET search_path TO ${safeSchema}, public;`;
}
