package com.cybelinx.platform.api.security.identity;

import com.cybelinx.platform.api.security.jwt.JwtVerificationError;
import com.cybelinx.platform.api.security.jwt.JwtVerifier;
import com.cybelinx.platform.api.security.jwt.JwtVerifier.VerifiedJwt;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * IdentityProvider implementation for Supabase Auth (50,000 Free MAU managed IAM provider).
 * Validates Supabase JWT signatures, claims (aud="authenticated", iss, sub, email), and resolves
 * platform identities.
 */
@Component
public class SupabaseIdentityProvider implements IdentityProvider {

    private static final Logger LOG = LoggerFactory.getLogger(SupabaseIdentityProvider.class);
    public static final String PROVIDER_NAME = "supabase";
    public static final String DEFAULT_AUDIENCE = "authenticated";

    private final JwtVerifier verifier;

    public SupabaseIdentityProvider(JwtVerifier verifier) {
        this.verifier = verifier;
    }

    @Override
    public Metadata metadata() {
        return new Metadata(
                PROVIDER_NAME,
                "https://*.supabase.co/auth/v1",
                List.of(DEFAULT_AUDIENCE),
                List.of("HS256", "RS256"),
                true
        );
    }

    @Override
    public IdentityToken verify(String accessToken) throws IdentityVerificationException {
        try {
            VerifiedJwt verified = verifier.verify(accessToken);
            IdentityClaims claims = IdentityClaims.from(verified.claims());
            LOG.debug("Supabase token verified for subject: {}, email: {}", claims.subject(), claims.email());
            return new IdentityToken(verified.token(), verified.alg(), verified.kid(), claims);
        } catch (JwtVerificationError error) {
            LOG.warn("Supabase identity verification failed: {}", error.getMessage());
            throw new IdentityVerificationException(error.reason(), error.getMessage());
        }
    }
}
