package com.cybelinx.platform.api.security;

import java.util.UUID;

/**
 * Port of the identity-provider adapter principal. The record is the authenticated principal
 * ({@code AuthPrincipal} in the TS adapter); the nested records are its companion types.
 */
public record AuthPrincipal(AuthUser user, AuthIdentity identity) {

    public record AuthUser(
            UUID id, String email, String displayName, String status, String locale, String timezone) {}

    public record AuthIdentity(String provider, String subject, String email, String name) {}

    public record PlatformUserIdentity(
            UUID id, UUID userId, String identityProvider, String externalSubject, String email, boolean isPrimary) {}
}