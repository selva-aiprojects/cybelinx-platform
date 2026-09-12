package com.cybelinx.platform.shared;

/**
 * Port of the TypeScript {@code ApiError} from {@code @cybelinx/shared}.
 *
 * <p>Carries a canonical {@link ErrorCode}, an explicit HTTP status (defaulting to the code's
 * mapping) and optional structured details. Serialized by the API exception handler.
 */
public class ApiError extends RuntimeException {

    private final ErrorCode code;
    private final int status;
    private final Object details;

    public ApiError(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public ApiError(ErrorCode code, String message, Object details) {
        this(code, message, null, details);
    }

    public ApiError(ErrorCode code, String message, Integer status, Object details) {
        super(message);
        this.code = code;
        this.status = status != null ? status : ErrorCode.defaultHttpStatus(code);
        this.details = details;
    }

    public ErrorCode getCode() {
        return code;
    }

    public int getStatus() {
        return status;
    }

    public Object getDetails() {
        return details;
    }
}