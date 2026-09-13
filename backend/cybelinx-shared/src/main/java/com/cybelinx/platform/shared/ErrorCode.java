package com.cybelinx.platform.shared;

/**
 * Port of {@code @cybelinx/shared} ErrorCode. Canonical error codes for the control plane API.
 */
public enum ErrorCode {
    UNAUTHORIZED,
    FORBIDDEN,
    VALIDATION_ERROR,
    TENANT_NOT_FOUND,
    TENANT_INACTIVE,
    TENANT_ACCESS_DENIED,
    TENANT_CODE_TAKEN,
    TENANT_STATUS_TRANSITION_INVALID,
    PRODUCT_NOT_FOUND,
    PRODUCT_CODE_TAKEN,
    PRODUCT_STATUS_TRANSITION_INVALID,
    PRODUCT_NOT_ENTITLED,
    PLAN_NOT_FOUND,
    REGION_NOT_FOUND,
    RESOURCE_NOT_FOUND,
    RESOURCE_NOT_READY,
    PROVISIONING_FAILED,
    INVALID_TENANT_CONTEXT,
    INTERNAL_ERROR;

    /** HTTP status used when the {@link ApiError} does not declare one explicitly. */
    public static int defaultHttpStatus(ErrorCode code) {
        return switch (code) {
            case UNAUTHORIZED -> 401;
            case FORBIDDEN, PRODUCT_NOT_ENTITLED, INVALID_TENANT_CONTEXT -> 403;
            case VALIDATION_ERROR -> 400;
            case TENANT_NOT_FOUND, PRODUCT_NOT_FOUND, PLAN_NOT_FOUND, REGION_NOT_FOUND, RESOURCE_NOT_FOUND -> 404;
            case TENANT_INACTIVE, TENANT_CODE_TAKEN, TENANT_STATUS_TRANSITION_INVALID,
                    PRODUCT_CODE_TAKEN, PRODUCT_STATUS_TRANSITION_INVALID -> 409;
            case RESOURCE_NOT_READY -> 503;
            case TENANT_ACCESS_DENIED -> 403;
            case PROVISIONING_FAILED, INTERNAL_ERROR -> 500;
        };
    }
}