package com.cybelinx.platform.api.common.error;

/**
 * An error whose HTTP status and body are fully specified by the producer.
 *
 * <p>Used to reproduce the NestJS {@code HttpException} wire shapes
 * ({@code {statusCode, message[, error]}}) that do not carry a canonical
 * {@link com.cybelinx.platform.shared.ErrorCode}.
 */
public class ApiHttpException extends RuntimeException {

    private final int status;
    private final Object body;

    public ApiHttpException(int status, Object body, String message) {
        super(message);
        this.status = status;
        this.body = body;
    }

    public int getStatus() {
        return status;
    }

    public Object getBody() {
        return body;
    }

    /** Builds a NestJS {@code UnauthorizedException} body. */
    public static ApiHttpException unauthorized(String message) {
        return new ApiHttpException(401, body(401, "Unauthorized", message), message);
    }

    /** Builds a NestJS {@code ForbiddenException} body. */
    public static ApiHttpException forbidden(String message) {
        return new ApiHttpException(403, body(403, "Forbidden", message), message);
    }

    /** Builds a NestJS {@code BadRequestException} body. */
    public static ApiHttpException badRequest(String message) {
        return new ApiHttpException(400, body(400, "Bad Request", message), message);
    }

    private static java.util.LinkedHashMap<String, Object> body(int status, String error, String message) {
        java.util.LinkedHashMap<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("statusCode", status);
        map.put("error", error);
        map.put("message", message);
        return map;
    }
}