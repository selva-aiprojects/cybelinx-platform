package com.cybelinx.platform.api.security.jwt;

import com.nimbusds.jwt.SignedJWT;

/**
 * Port of {@code UnconfiguredTokenSignatureVerifier}: no signing material configured, so
 * signature verification (and therefore authentication) is unavailable.
 */
public final class UnconfiguredSignatureVerifier implements SignatureVerifier {

    @Override
    public String algorithm() {
        return "HS256";
    }

    @Override
    public String kind() {
        return "unconfigured";
    }

    @Override
    public boolean verify(SignedJWT jwt) {
        throw new JwtVerificationError(JwtReason.NOT_CONFIGURED, "JWT signature verification is not configured");
    }
}