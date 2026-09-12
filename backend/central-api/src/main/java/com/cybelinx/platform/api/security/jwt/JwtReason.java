package com.cybelinx.platform.api.security.jwt;

/** Port of the {@code JwtVerificationReason} union. */
public enum JwtReason {
    MALFORMED_TOKEN,
    UNSUPPORTED_ALGORITHM,
    SIGNATURE_INVALID,
    MISSING_SUBJECT,
    INVALID_ISSUER,
    INVALID_AUDIENCE,
    EXPIRED_TOKEN,
    TOKEN_NOT_YET_VALID,
    NOT_CONFIGURED
}