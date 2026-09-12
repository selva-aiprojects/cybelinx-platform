package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.security.jwt.JwtVerificationError;
import com.cybelinx.platform.api.security.jwt.JwtVerifier;
import com.cybelinx.platform.api.security.jwt.JwtVerifier.VerifiedJwt;
import java.util.List;
import java.util.Map;

/**
 * Port of {@code IdentityService}: validates bearer tokens and resolves the authenticated
 * principal through the configured identity provider.
 */
public final class IdentityService {

    private final String providerName;
    private final JwtVerifier verifier;
    private final UserMappingService userMapping;

    public IdentityService(String providerName, JwtVerifier verifier, UserMappingService userMapping) {
        this.providerName = providerName;
        this.verifier = verifier;
        this.userMapping = userMapping;
    }

    /** Port of {@code IdentityProvider.getProviderMetadata()}. */
    public ProviderMetadata getProviderMetadata() {
        return new ProviderMetadata(
                providerName,
                null,
                null,
                List.of(verifier.algorithm()),
                "jwks".equals(verifier.kind()));
    }

    public ValidatedToken validateToken(String accessToken) {
        try {
            VerifiedJwt verified = verifier.verify(accessToken);
            return new ValidatedToken(accessToken, providerName, verified.alg(), verified.kid(), verified.claims());
        } catch (JwtVerificationError error) {
            throw ApiHttpException.unauthorized("Invalid access token: " + error.reason().name());
        }
    }

    public AuthPrincipal resolvePrincipal(String accessToken) {
        ValidatedToken validated = validateToken(accessToken);
        AuthPrincipal.AuthIdentity identity = getUserIdentity(validated);
        AuthPrincipal.AuthUser user = userMapping.lookupUser(identity);

        if (user == null) {
            throw ApiHttpException.unauthorized("Access token is valid but the user is not mapped to the platform");
        }

        return new AuthPrincipal(user, identity);
    }

    /** Port of {@code ExternalIdentityProvider.getUserIdentity()}. */
    private AuthPrincipal.AuthIdentity getUserIdentity(ValidatedToken validated) {
        Map<String, Object> claims = validated.claims();
        String email = claims.get("email") instanceof String value ? value : null;
        String name = claims.get("name") instanceof String value ? value : null;
        return new AuthPrincipal.AuthIdentity(providerName, String.valueOf(claims.get("sub")), email, name);
    }

    /** Port of {@code ProviderMetadata}. */
    public record ProviderMetadata(
            String provider, String issuer, List<String> audience, List<String> supportedAlgorithms, boolean supportsJwks) {}

    /** Port of {@code ValidatedToken}. */
    public record ValidatedToken(String token, String provider, String alg, String kid, Map<String, Object> claims) {}
}