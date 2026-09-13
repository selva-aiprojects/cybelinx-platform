package com.cybelinx.platform.api.security.identity;

import com.cybelinx.platform.api.security.jwt.JwtVerificationError;
import com.cybelinx.platform.api.security.jwt.JwtVerifier;
import com.cybelinx.platform.api.security.jwt.JwtVerifier.VerifiedJwt;
import java.util.List;

/** Adapts the JWT verifier (HMAC or JWKS strategy) to the provider-agnostic contract. */
public final class JwtIdentityProvider implements IdentityProvider {

    private final String providerName;
    private final JwtVerifier verifier;

    public JwtIdentityProvider(String providerName, JwtVerifier verifier) {
        this.providerName = providerName;
        this.verifier = verifier;
    }

    @Override
    public IdentityToken verify(String accessToken) {
        try {
            VerifiedJwt verified = verifier.verify(accessToken);
            return new IdentityToken(
                    verified.token(),
                    verified.alg(),
                    verified.kid(),
                    IdentityClaims.from(verified.claims()));
        } catch (JwtVerificationError error) {
            throw new IdentityVerificationException(error.reason(), error.getMessage());
        }
    }

    @Override
    public Metadata metadata() {
        return new Metadata(
                providerName,
                null,
                null,
                List.of(verifier.algorithm()),
                "jwks".equals(verifier.kind()));
    }
}