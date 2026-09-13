package com.cybelinx.platform.api.security.identity;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Normalized, provider-agnostic identity claims extracted from a verified token.
 * Only well-known profile claims are surfaced; everything else stays in {@link #raw()}.
 */
public record IdentityClaims(
        String subject,
        String issuer,
        List<String> audience,
        String email,
        String name,
        Instant issuedAt,
        Instant notBefore,
        Instant expiresAt,
        Map<String, Object> raw) {

    public static IdentityClaims from(Map<String, Object> claims) {
        Object aud = claims.get("aud");
        List<String> audience = aud instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : aud != null ? List.of(String.valueOf(aud)) : List.of();

        return new IdentityClaims(
                claims.get("sub") == null ? null : String.valueOf(claims.get("sub")),
                claims.get("iss") == null ? null : String.valueOf(claims.get("iss")),
                audience,
                claims.get("email") instanceof String email ? email : null,
                claims.get("name") instanceof String name ? name : null,
                toInstant(claims.get("iat")),
                toInstant(claims.get("nbf")),
                toInstant(claims.get("exp")),
                Map.copyOf(claims));
    }

    private static Instant toInstant(Object value) {
        return value instanceof Number n ? Instant.ofEpochSecond(n.longValue()) : null;
    }
}