package com.cybelinx.platform.api.auth;

import java.time.Instant;
import java.util.List;

/**
 * Successful {@code POST /auth/login} payload. Mirrors the shape the Admin Portal expects from the
 * (removed) dev token-mint route so the frontend can consume it unchanged.
 */
public record LoginResponse(
        String token,
        String sub,
        String email,
        List<String> roles,
        Instant expiresAt,
        boolean isProductionSecret) {}