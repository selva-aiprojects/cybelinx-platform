import type {
  AccessView,
  AttachTenantProductRequest,
  CreateEntitlementRequest,
  CreatePlanRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTenantRequest,
  CreateTenantResponse,
  EntitlementActionResponse,
  EntitlementListResponse,
  EntitlementView,
  ErrorEnvelope,
  IsolationMode,
  PlanActionResponse,
  PlanListResponse,
  PlanStatus,
  PlanView,
  ProductActionResponse,
  ProductListResponse,
  ProductStatus,
  ProductVersionListResponse,
  ProductVersionView,
  ProductView,
  ProvisioningJobView,
  PublishVersionResponse,
  RegisterTenantResourceRequest,
  TenantActionResponse,
  TenantDetailResponse,
  TenantListResponse,
  TenantProductActionResponse,
  TenantProductListResponse,
  TenantProductStatus,
  TenantProductView,
  TenantResourceActionResponse,
  TenantResourceListResponse,
  TenantResourceView,
  TenantStatus,
  TenantView,
  UpdateEntitlementRequest,
  UpdatePlanRequest,
  UpdateProductRequest,
  UpdateTenantResourceRequest,
  UpdateTenantRequest,
} from './types';

const STORAGE_TOKEN_KEY = 'cybelinx_api_token';
const STORAGE_BASE_URL_KEY = 'cybelinx_api_base_url';

export const DEFAULT_DEV_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWVkLWRldi1hZG1pbi0wMDAxIiwiZW1haWwiOiJkZXYuYWRtaW5AY3liZWxpbngudGVzdCIsInJvbGVzIjpbIkNZQkVMSU5YX1BMQVRGT1JNX0FETUlOIl19.dev-demo-token';

export const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;

export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  return window.localStorage.getItem(STORAGE_BASE_URL_KEY) ?? DEFAULT_API_BASE_URL;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return DEFAULT_DEV_TOKEN;
  return window.localStorage.getItem(STORAGE_TOKEN_KEY) ?? DEFAULT_DEV_TOKEN;
}

export async function fetchMintedToken(): Promise<string> {
  const res = await fetch('/api/auth/token');
  if (!res.ok) throw new Error('Failed to mint token from server');
  const data = (await res.json()) as { token: string };
  return data.token;
}

export function storeSettings(token: string | null, baseUrl: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
  else window.localStorage.removeItem(STORAGE_TOKEN_KEY);
  if (baseUrl) window.localStorage.setItem(STORAGE_BASE_URL_KEY, baseUrl);
  else window.localStorage.removeItem(STORAGE_BASE_URL_KEY);
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

const jsonHeaders = (): Record<string, string> => ({ 'Content-Type': 'application/json' });

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const headers = jsonHeaders();
  const activeToken = token !== undefined ? token : getStoredToken();
  if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

  let response: Response;
  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiClientError(0, 'NETWORK_ERROR', `Unable to reach the API at ${resolveApiBaseUrl()}`, error);
  }

  if (!response.ok) {
    let envelope: ErrorEnvelope | null = null;
    try {
      envelope = (await response.json()) as ErrorEnvelope;
    } catch {
      // non-JSON error body
    }
    throw new ApiClientError(
      response.status,
      envelope?.code,
      envelope?.message ?? `Request failed with status ${response.status}`,
      envelope?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function buildQuery(params: object | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
}

export const api = {
  products: {
    list: (params?: ListParams) =>
      request<ProductListResponse>(`/products${buildQuery(params)}`),
    get: (productId: string) => request<ProductView>(`/products/${productId}`),
    create: (body: CreateProductRequest) =>
      request<ProductView>('/products', { method: 'POST', body }),
    update: (productId: string, body: UpdateProductRequest) =>
      request<ProductView>(`/products/${productId}`, { method: 'PUT', body }),
    setStatus: (productId: string, status: ProductStatus) =>
      request<ProductActionResponse>(`/products/${productId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    versions: {
      list: (productId: string) =>
        request<ProductVersionListResponse>(`/products/${productId}/versions`),
      get: (productId: string, versionId: string) =>
        request<ProductVersionView>(`/products/${productId}/versions/${versionId}`),
      create: (productId: string, body: CreateProductVersionRequest) =>
        request<ProductVersionView>(`/products/${productId}/versions`, { method: 'POST', body }),
      publish: (productId: string, versionId: string) =>
        request<PublishVersionResponse>(`/products/${productId}/versions/${versionId}/publish`, {
          method: 'PUT',
          body: {},
        }),
    },
    plans: {
      list: (productId: string, status?: PlanStatus) =>
        request<PlanListResponse>(`/products/${productId}/plans${buildQuery({ status })}`),
      get: (productId: string, planId: string) =>
        request<PlanView>(`/products/${productId}/plans/${planId}`),
      create: (productId: string, body: CreatePlanRequest) =>
        request<PlanView>(`/products/${productId}/plans`, { method: 'POST', body }),
      update: (productId: string, planId: string, body: UpdatePlanRequest) =>
        request<PlanView>(`/products/${productId}/plans/${planId}`, { method: 'PUT', body }),
      setStatus: (productId: string, planId: string, status: PlanStatus) =>
        request<PlanActionResponse>(`/products/${productId}/plans/${planId}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      entitlements: {
        list: (productId: string, planId: string) =>
          request<EntitlementListResponse>(
            `/products/${productId}/plans/${planId}/entitlements`,
          ),
        get: (productId: string, planId: string, entitlementId: string) =>
          request<EntitlementView>(`/products/${productId}/plans/${planId}/entitlements/${entitlementId}`),
        create: (productId: string, planId: string, body: CreateEntitlementRequest) =>
          request<EntitlementView>(`/products/${productId}/plans/${planId}/entitlements`, {
            method: 'POST',
            body,
          }),
        update: (
          productId: string,
          planId: string,
          entitlementId: string,
          body: UpdateEntitlementRequest,
        ) =>
          request<EntitlementView>(
            `/products/${productId}/plans/${planId}/entitlements/${entitlementId}`,
            { method: 'PUT', body },
          ),
        setStatus: (
          productId: string,
          planId: string,
          entitlementId: string,
          status: string,
        ) =>
          request<EntitlementActionResponse>(
            `/products/${productId}/plans/${planId}/entitlements/${entitlementId}/status`,
            { method: 'PATCH', body: { status } },
          ),
      },
    },
  },

  tenants: {
    list: (params?: ListParams) =>
      request<TenantListResponse>(`/tenants${buildQuery(params)}`),
    get: (tenantId: string) => request<TenantDetailResponse>(`/tenants/${tenantId}`),
    create: (body: CreateTenantRequest) => request<CreateTenantResponse>('/tenants', { method: 'POST', body }),
    update: (tenantId: string, body: UpdateTenantRequest) =>
      request<TenantView>(`/tenants/${tenantId}`, { method: 'PATCH', body }),
    suspend: (tenantId: string) =>
      request<TenantActionResponse>(`/tenants/${tenantId}/suspend`, { method: 'POST', body: {} }),
    activate: (tenantId: string) =>
      request<TenantActionResponse>(`/tenants/${tenantId}/activate`, { method: 'POST', body: {} }),
    remove: (tenantId: string) => request<TenantActionResponse>(`/tenants/${tenantId}`, { method: 'DELETE' }),
  },

  tenantProducts: {
    list: (tenantId: string) =>
      request<TenantProductListResponse>(`/tenants/${tenantId}/products`),
    attach: (tenantId: string, body: AttachTenantProductRequest) =>
      request<TenantProductView>(`/tenants/${tenantId}/products`, { method: 'POST', body }),
    setStatus: (tenantId: string, productCode: string, status: TenantProductStatus) =>
      request<TenantProductActionResponse>(`/tenants/${tenantId}/products/${productCode}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    detach: (tenantId: string, productCode: string) =>
      request<TenantProductActionResponse>(`/tenants/${tenantId}/products/${productCode}`, {
        method: 'DELETE',
      }),
  },

  tenantResources: {
    list: (tenantId: string) =>
      request<TenantResourceListResponse>(`/tenants/${tenantId}/resources`),
    register: (tenantId: string, body: RegisterTenantResourceRequest) =>
      request<TenantResourceView>(`/tenants/${tenantId}/resources`, { method: 'POST', body }),
    update: (tenantId: string, resourceId: string, body: UpdateTenantResourceRequest) =>
      request<TenantResourceView>(`/tenants/${tenantId}/resources/${resourceId}`, {
        method: 'PATCH',
        body,
      }),
    remove: (tenantId: string, resourceId: string) =>
      request<TenantResourceActionResponse>(`/tenants/${tenantId}/resources/${resourceId}`, {
        method: 'DELETE',
      }),
  },

  regions: {
    list: () => request<unknown[]>('/regions'),
  },
};

export type { AccessView, IsolationMode, ProvisioningJobView, TenantProductView, TenantStatus };