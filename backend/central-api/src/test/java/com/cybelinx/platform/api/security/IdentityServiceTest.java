package com.cybelinx.platform.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthUser;
import com.cybelinx.platform.api.security.identity.IdentityClaims;
import com.cybelinx.platform.api.security.identity.IdentityProvider;
import com.cybelinx.platform.api.security.identity.IdentityToken;
import com.cybelinx.platform.api.security.identity.IdentityVerificationException;
import com.cybelinx.platform.api.security.jwt.JwtReason;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit tests for the identity facade: provider delegation, mapping and 401 semantics. */
class IdentityServiceTest {

    private static final IdentityProvider.Metadata METADATA = new IdentityProvider.Metadata(
            "oidc", "https://idp.example.com", List.of("cybelinx-platform"), List.of("RS256"), true);

    private final IdentityProvider provider = mock(IdentityProvider.class);
    private final UserMappingService userMapping = mock(UserMappingService.class);
    private final IdentityService service = new IdentityService(provider, userMapping);

    @BeforeEach
    void setUp() {
        when(provider.metadata()).thenReturn(METADATA);
    }

    @Test
    void validateToken_delegatesToProvider_andCarriesPayload() {
        when(provider.verify("abc")).thenReturn(token());

        IdentityService.ValidatedToken validated = service.validateToken("abc");

        assertEquals("abc", validated.token());
        assertEquals("oidc", validated.provider());
        assertEquals("RS256", validated.alg());
        assertEquals("k1", validated.kid());
        assertEquals("usr-1", validated.claims().get("sub"));
    }

    @Test
    void validateToken_whenProviderRejects_returns401WithReason() {
        when(provider.verify("bad")).thenThrow(new IdentityVerificationException(JwtReason.MALFORMED_TOKEN, "bad token"));

        ApiHttpException error = assertThrows(ApiHttpException.class, () -> service.validateToken("bad"));

        assertEquals(401, error.getStatus());
        assertEquals("Invalid access token: MALFORMED_TOKEN", error.getMessage());
    }

    @Test
    void resolvePrincipal_provisionsMappingOnFirstSignIn() {
        when(provider.verify("abc")).thenReturn(token());
        when(userMapping.resolveUser(any())).thenAnswer(invocation -> {
            AuthIdentity identity = invocation.getArgument(0);
            assertEquals("oidc", identity.provider());
            assertEquals("usr-1", identity.subject());
            assertEquals("alice@example.com", identity.email());
            assertEquals("Alice", identity.name());
            return new AuthUser(UUID.randomUUID(), "alice@example.com", "Alice", "ACTIVE", null, null);
        });

        AuthPrincipal principal = service.resolvePrincipal("abc");

        assertNotNull(principal.user());
        assertNotNull(principal.identity());
        verify(userMapping).resolveUser(any());
    }

    @Test
    void resolvePrincipal_whenProviderRejects_doesNotTouchMapping() {
        when(provider.verify("bad")).thenThrow(new IdentityVerificationException(JwtReason.EXPIRED_TOKEN, "expired"));

        ApiHttpException error = assertThrows(ApiHttpException.class, () -> service.resolvePrincipal("bad"));

        assertEquals(401, error.getStatus());
        verify(userMapping, never()).resolveUser(any());
    }

    @Test
    void resolvePrincipal_whenMappingUnavailable_returns401NotMapped() {
        when(provider.verify("abc")).thenReturn(token());
        when(userMapping.resolveUser(any())).thenReturn(null);

        ApiHttpException error = assertThrows(ApiHttpException.class, () -> service.resolvePrincipal("abc"));

        assertEquals(401, error.getStatus());
        assertEquals("Access token is valid but the user is not mapped to the platform", error.getMessage());
    }

    @Test
    void getProviderMetadata_surfacesProviderCapabilities() {
        IdentityService.ProviderMetadata metadata = service.getProviderMetadata();

        assertEquals("oidc", metadata.provider());
        assertEquals(List.of("RS256"), metadata.supportedAlgorithms());
        assertEquals(true, metadata.supportsJwks());
    }

    private static IdentityToken token() {
        return new IdentityToken("abc", "RS256", "k1", IdentityClaims.from(Map.of(
                "sub", "usr-1",
                "iss", "https://idp.example.com",
                "email", "alice@example.com",
                "name", "Alice")));
    }
}