package com.cybelinx.platform.api.security.identity;

/** A successfully verified identity token from the configured identity provider. */
public record IdentityToken(String rawToken, String algorithm, String keyId, IdentityClaims claims) {}