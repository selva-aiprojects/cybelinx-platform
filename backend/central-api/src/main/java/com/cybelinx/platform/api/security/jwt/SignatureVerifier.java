package com.cybelinx.platform.api.security.jwt;

import com.nimbusds.jwt.SignedJWT;

/**
 * Port of the {@code TokenSignatureVerifier} strategy: HMAC (HS256), JWKS (RS256) or
 * unconfigured.
 */
public interface SignatureVerifier {

    /** Expected JWT algorithm for this verifier ({@code HS256} or {@code RS256}). */
    String algorithm();

    /** Verifier kind: {@code hmac}, {@code jwks} or {@code unconfigured}. */
    String kind();

    /**
     * @return {@code true} when the JWT signature is valid; {@code false} when it does not match.
     * @throws JwtVerificationError when the verifier cannot operate (e.g. not configured, failed fetch)
     */
    boolean verify(SignedJWT jwt);
}