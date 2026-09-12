package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Port of the NestJS {@code AuthenticationGuard} + {@code AuthorizationGuard} stacked guards for
 * {@code /tenants/**}: resolves the bearer token into a principal and enforces
 * {@link RequirePermissions} metadata on the matched handler.
 */
@Component
public class TenantAuthInterceptor implements HandlerInterceptor {

    public static final String PRINCIPAL_ATTR = "cybelinx.auth-principal";

    private final IdentityService identity;
    private final AuthorizationService authorization;

    public TenantAuthInterceptor(IdentityService identity, AuthorizationService authorization) {
        this.identity = identity;
        this.authorization = authorization;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        String header = request.getHeader("Authorization");
        String token = getBearerToken(header);
        if (token == null) {
            throw ApiHttpException.unauthorized("Missing or malformed Authorization header");
        }

        AuthPrincipal principal = identity.resolvePrincipal(token);
        request.setAttribute(PRINCIPAL_ATTR, principal);

        String[] required = requiredPermissions(handlerMethod);
        if (required.length == 0) {
            return true;
        }

        for (String permission : required) {
            if (authorization.hasPermission(principal.user().id(), permission)) {
                return true;
            }
        }

        throw ApiHttpException.forbidden("Missing required permission(s): " + String.join(", ", required));
    }

    private String[] requiredPermissions(HandlerMethod handlerMethod) {
        RequirePermissions methodAnnotation = handlerMethod.getMethodAnnotation(RequirePermissions.class);
        if (methodAnnotation != null) {
            return methodAnnotation.value();
        }
        RequirePermissions classAnnotation = handlerMethod.getBeanType().getAnnotation(RequirePermissions.class);
        return classAnnotation == null ? new String[0] : classAnnotation.value();
    }

    private static String getBearerToken(String header) {
        if (header == null) {
            return null;
        }
        String[] parts = header.split(" ", 2);
        if (parts.length < 2 || !"Bearer".equals(parts[0]) || parts[1] == null || parts[1].isEmpty()) {
            return null;
        }
        return parts[1];
    }
}