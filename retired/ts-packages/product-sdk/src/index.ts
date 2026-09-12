import type { PlatformEvent } from '@cybelinx/event-contracts';
import type { TenantContext } from '@cybelinx/tenant-context';

export interface ProductSDKConfig {
  platformUrl: string;
  apiToken?: string;
  requestTimeoutMs?: number;
}

export interface TenantResource {
  resourceId: string;
  isolationMode: string;
  databaseHost?: string;
  databaseName?: string;
  schemaName?: string;
  region?: string;
}

export interface ProductSDK {
  getTenantContext(tenantId: string, productId: string): Promise<TenantContext>;
  checkEntitlement(tenantId: string, productId: string): Promise<boolean>;
  resolveTenantResource(tenantId: string, productId: string): Promise<TenantResource>;
  publishEvent(event: PlatformEvent): Promise<void>;
}

const NOT_WIRED = 'ProductSDK is scaffolded but not yet wired to the central-api.';

export class CybelinxProductSDK implements ProductSDK {
  private readonly baseUrl: string;

  constructor(config: ProductSDKConfig) {
    this.baseUrl = config.platformUrl.replace(/\/+$/, '');
  }

  private notWired(): never {
    throw new Error(`${NOT_WIRED} baseUrl=${this.baseUrl}`);
  }

  async getTenantContext(_tenantId: string, _productId: string): Promise<TenantContext> {
    return this.notWired();
  }

  async checkEntitlement(_tenantId: string, _productId: string): Promise<boolean> {
    return this.notWired();
  }

  async resolveTenantResource(_tenantId: string, _productId: string): Promise<TenantResource> {
    return this.notWired();
  }

  async publishEvent(_event: PlatformEvent): Promise<void> {
    return this.notWired();
  }
}