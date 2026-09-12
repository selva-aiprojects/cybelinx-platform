export const APP_NAME = 'Cybelinx Central SaaS Platform';
export const API_PREFIX = '/api/v1';
export const DEFAULT_API_PORT = 3001;
export const DEFAULT_WORKER_PORT = 3002;
export const DEFAULT_ADMIN_PORT = 3000;

export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',
  TENANT_CODE_TAKEN: 'TENANT_CODE_TAKEN',
  TENANT_STATUS_TRANSITION_INVALID: 'TENANT_STATUS_TRANSITION_INVALID',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_NOT_ENTITLED: 'PRODUCT_NOT_ENTITLED',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  REGION_NOT_FOUND: 'REGION_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_NOT_READY: 'RESOURCE_NOT_READY',
  PROVISIONING_FAILED: 'PROVISIONING_FAILED',
  INVALID_TENANT_CONTEXT: 'INVALID_TENANT_CONTEXT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.TENANT_NOT_FOUND]: 404,
  [ErrorCode.TENANT_INACTIVE]: 409,
  [ErrorCode.TENANT_ACCESS_DENIED]: 403,
  [ErrorCode.TENANT_CODE_TAKEN]: 409,
  [ErrorCode.TENANT_STATUS_TRANSITION_INVALID]: 409,
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_NOT_ENTITLED]: 403,
  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.REGION_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_READY]: 503,
  [ErrorCode.PROVISIONING_FAILED]: 500,
  [ErrorCode.INVALID_TENANT_CONTEXT]: 403,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export const errorCodeToStatus = (code: ErrorCode): number => ERROR_CODE_TO_STATUS[code] ?? 500;

export class ApiError extends Error {
  public readonly status: number;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? errorCodeToStatus(code);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;