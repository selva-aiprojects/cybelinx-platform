package com.cybelinx.platform.api.security.identity;

import java.util.List;

/**
 * Decouples the control plane from a specific identity provider (OAuth2 / OIDC / JWT).
 * The provider is solely responsible for authentication; the platform derives identity,
 * membership and authorization downstream.
 */
public interface IdentityProvider {

    IdentityToken verify(String accessToken) throws IdentityVerificationException;

    Metadata metadata();

    record Metadata(
            String provider,
            String issuer,
            List<String> audience,
            List<String> supportedAlgorithms,
            boolean supportsJwks) {}
}