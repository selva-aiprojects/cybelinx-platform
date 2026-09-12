import {
  ENVIRONMENTS,
  ISOLATION_MODES,
  TENANT_STATUSES,
  isEntitlementStatus,
  isEnvironment,
  isIsolationMode,
  isPlanStatus,
  isProductCode,
  isProductStatus,
  isTenantProductStatus,
  isTenantStatus,
} from '../src';

describe('@cybelinx/types', () => {
  it('exposes canonical tenant statuses with the full lifecycle', () => {
    expect(TENANT_STATUSES).toEqual([
      'PROVISIONING',
      'ACTIVE',
      'SUSPENDED',
      'DEACTIVATED',
      'DELETION_PENDING',
      'DELETED',
    ]);
    expect(isTenantStatus('ACTIVE')).toBe(true);
    expect(isTenantStatus('WEIRD')).toBe(false);
  });

  it('supports the four isolation modes', () => {
    expect(ISOLATION_MODES).toEqual([
      'SHARED_POOL',
      'SCHEMA_PER_TENANT',
      'DEDICATED_DATABASE',
      'DEDICATED_INFRASTRUCTURE',
    ]);
    expect(isIsolationMode('SHARED_POOL')).toBe(true);
    expect(isIsolationMode('CLOUD')).toBe(false);
  });

  it('recognizes environments', () => {
    expect(ENVIRONMENTS).toEqual(['DEVELOPMENT', 'STAGING', 'PRODUCTION']);
    expect(isEnvironment('PRODUCTION')).toBe(true);
    expect(isEnvironment('QA')).toBe(false);
  });

  it('recognizes entitlement statuses, product codes and lifecycle statuses', () => {
    expect(isEntitlementStatus('SUSPENDED')).toBe(true);
    expect(isProductCode('JIOPLIX')).toBe(true);
    expect(isProductCode('JIOPLIX_SMART')).toBe(true);
    expect(isProductCode('SALESFORCE')).toBe(false);
    expect(isProductStatus('ACTIVE')).toBe(true);
    expect(isTenantProductStatus('ACTIVE')).toBe(true);
    expect(isPlanStatus('RETIRED')).toBe(true);
    expect(isPlanStatus('QUEUED')).toBe(false);
  });
});