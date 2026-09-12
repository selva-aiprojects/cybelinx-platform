import { CybelinxProductSDK } from '../src';

describe('@cybelinx/product-sdk', () => {
  const sdk = new CybelinxProductSDK({ platformUrl: 'http://localhost:3001' });

  it('exposes the expected interface methods', () => {
    expect(typeof sdk.getTenantContext).toBe('function');
    expect(typeof sdk.checkEntitlement).toBe('function');
    expect(typeof sdk.resolveTenantResource).toBe('function');
    expect(typeof sdk.publishEvent).toBe('function');
  });

  it('rejects with a clear error when not yet wired', async () => {
    await expect(sdk.getTenantContext('t1', 'JIOPLIX')).rejects.toThrow('not yet wired');
    await expect(sdk.checkEntitlement('t1', 'LIMS')).rejects.toThrow('not yet wired');
    await expect(sdk.resolveTenantResource('t1', 'STOREAI')).rejects.toThrow('not yet wired');
    await expect(
      sdk.publishEvent({
        eventId: '00000000-0000-0000-0000-000000000001',
        eventType: 'TENANT_CREATED',
        occurredAt: '2026-01-01T00:00:00Z',
        schemaVersion: '1.0',
        payload: {},
      }),
    ).rejects.toThrow('not yet wired');
  });

  it('encodes the baseUrl in the error message', async () => {
    const custom = new CybelinxProductSDK({ platformUrl: 'https://api.example.com/' });
    await expect(custom.getTenantContext('x', 'x')).rejects.toThrow('api.example.com');
  });
});