import { ApiError, ErrorCode, errorCodeToStatus, isApiError, APP_NAME, API_PREFIX } from '../src';

describe('@cybelinx/shared', () => {
  it('exposes platform constants', () => {
    expect(APP_NAME).toBe('Cybelinx Central SaaS Platform');
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('maps error codes to HTTP statuses', () => {
    expect(errorCodeToStatus(ErrorCode.UNAUTHORIZED)).toBe(401);
    expect(errorCodeToStatus(ErrorCode.TENANT_ACCESS_DENIED)).toBe(403);
    expect(errorCodeToStatus(ErrorCode.TENANT_NOT_FOUND)).toBe(404);
    expect(errorCodeToStatus(ErrorCode.TENANT_CODE_TAKEN)).toBe(409);
    expect(errorCodeToStatus(ErrorCode.TENANT_STATUS_TRANSITION_INVALID)).toBe(409);
    expect(errorCodeToStatus(ErrorCode.RESOURCE_NOT_READY)).toBe(503);
  });

  it('builds an ApiError with code, message, status and details', () => {
    const error = new ApiError(ErrorCode.PROVISIONING_FAILED, 'boom', undefined, { jobId: 'j1' });
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ErrorCode.PROVISIONING_FAILED);
    expect(error.status).toBe(500);
    expect(error.details).toEqual({ jobId: 'j1' });
    expect(isApiError(error)).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
  });
});