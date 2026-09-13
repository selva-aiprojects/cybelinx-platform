package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.security.identity.IdentityClaims;
import com.cybelinx.platform.api.security.identity.IdentityProvider;
import com.cybelinx.platform.api.security.identity.IdentityToken;
import com.cybelinx.platform.api.security.identity.IdentityVerificationException;
import java.util.Map;

/**
 * Resolves bearer tokens to platform principals via the configured {@link IdentityProvider}.
 * Authentication is delegated; the platform handles user mapping and downstream authorization.
 */
public final class IdentityService {

    private final IdentityProvider provider;
    private final UserMappingService userMapping;

    public IdentityService(IdentityProvider provider, UserMappingService userMapping) {
        this.provider = provider;
        this.userMapping = userMapping;
    }

    public ProviderMetadata getProviderMetadata() {
        IdentityProvider.Metadata metadata = provider.metadata();
        return new ProviderMetadata(
                metadata.provider(),
                metadata.issuer(),
                metadata.audience(),
                metadata.supportedAlgorithms(),
                metadata.supportsJwks());
    }

    public ValidatedToken validateToken(String accessToken) {
        try {
            IdentityToken token = provider.verify(accessToken);
            return new ValidatedToken(
                    token.rawToken(),
                    provider.metadata().provider(),
                    token.algorithm(),
                    token.keyId(),
                    token.claims().raw());
        } catch (IdentityVerificationException error) {
            throw ApiHttpException.unauthorized("Invalid access token: " + error.reason().name());
        }
    }

    public AuthPrincipal resolvePrincipal(String accessToken) {
        ValidatedToken validated = validateToken(accessToken);
        AuthPrincipal.AuthIdentity identity = toAuthIdentity(validated);
        AuthPrincipal.AuthUser user = userMapping.resolveUser(identity);

        if (user == null) {
            throw ApiHttpException.unauthorized("Access token is valid but the user is not mapped to the platform");
        }

        return new AuthPrincipal(user, identity);
    }

    private AuthPrincipal.AuthIdentity toAuthIdentity(ValidatedToken validated) {
        Map<String, Object> claims = validated.claims();
        IdentityClaims parsed = IdentityClaims.from(claims);
        return new AuthPrincipal.AuthIdentity(
                provider.metadata().provider(),
                parsed.subject(),
                parsed.email(),
                parsed.name());
    }

    public record ProviderMetadata(
            String provider, String issuer, java.util.List<String> audience,
            java.util.List<String> supportedAlgorithms, boolean supportsJwks) {}

    public record ValidatedToken(String token, String provider, String alg, String kid, Map<String, Object> claims) {}
}