package com.cybelinx.platform.api.common.error;

import com.cybelinx.platform.shared.ApiError;
import jakarta.servlet.ServletException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Port of the NestJS global exception handling:
 *
 * <ul>
 *   <li>{@link ApiError} &#8594; {@code {statusCode, code, message, details?}} (ApiErrorFilter);
 *   <li>validation and framework failures &#8594; NestJS {@code HttpException} wire shapes.
 * </ul>
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiError.class)
    public ResponseEntity<Map<String, Object>> handleApiError(ApiError error) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", error.getStatus());
        body.put("code", error.getCode().name());
        body.put("message", error.getMessage());
        if (error.getDetails() != null) {
            body.put("details", error.getDetails());
        }
        return ResponseEntity.status(error.getStatus()).body(body);
    }

    @ExceptionHandler(ApiHttpException.class)
    public ResponseEntity<Object> handleApiHttpException(ApiHttpException error) {
        return ResponseEntity.status(error.getStatus()).body(error.getBody());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        List<String> messages = new ArrayList<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError -> messages.add(fieldError.getDefaultMessage()));
        ex.getBindingResult().getGlobalErrors().forEach(objectError -> messages.add(objectError.getDefaultMessage()));
        return badRequest(messages);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return badRequest("Validation failed (invalid value for \"" + ex.getName() + "\")");
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, ServletRequestBindingException.class, ServletException.class})
    public ResponseEntity<Map<String, Object>> handleUnreadable(Exception ex) {
        return badRequest("The request is malformed or contains invalid/unknown values");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoResourceFoundException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", HttpStatus.NOT_FOUND.value());
        body.put("error", "Not Found");
        String path = ex.getResourcePath();
        body.put("message", "Cannot " + ex.getHttpMethod() + " " + (path.startsWith("/") ? path : "/" + path));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("message", "Internal server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private ResponseEntity<Map<String, Object>> badRequest(Object message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Bad Request");
        body.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}