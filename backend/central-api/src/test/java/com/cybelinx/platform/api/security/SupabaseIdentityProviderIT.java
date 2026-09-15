package com.cybelinx.platform.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.security.identity.IdentityToken;
import com.cybelinx.platform.api.security.identity.IdentityVerificationException;
import com.cybelinx.platform.api.security.identity.IdentityProvider;
import com.cybelinx.platform.api.security.identity.SupabaseIdentityProvider;
import com.cybelinx.platform.api.security.jwt.HmacSignatureVerifier;
import com.cybelinx.platform.api.security.jwt.JwtVerifier;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/** Integration coverage for Supabase Auth (50,000 Free MAU IAM provider). */
@SpringBootTest
@Transactional
class SupabaseIdentityProviderIT {

    private static final String SECRET = "supa-secret-key-must-be-at-least-32-chars-long!";
    private SupabaseIdentityProvider provider;

    @BeforeEach
    void setUp() {
        HmacSignatureVerifier hmacVerifier = new HmacSignatureVerifier(SECRET);
        JwtVerifier jwtVerifier = new JwtVerifier("https://demo.supabase.co/auth/v1", "authenticated", 30, hmacVerifier);
        provider = new SupabaseIdentityProvider(jwtVerifier);
    }

    @Test
    void metadata_returnsSupabaseDetails() {
        IdentityProvider.Metadata meta = provider.metadata();
        assertThat(meta.provider()).isEqualTo("supabase");
        assertThat(meta.audience()).contains("authenticated");
    }

    @Test
    void verify_validSupabaseToken_returnsIdentityToken() throws Exception {
        String token = createSupabaseToken("sub-supa-101", "user@hospital.com", "authenticated", Instant.now().plusSeconds(3600));

        IdentityToken identityToken = provider.verify(token);

        assertThat(identityToken).isNotNull();
        assertThat(identityToken.claims().subject()).isEqualTo("sub-supa-101");
        assertThat(identityToken.claims().email()).isEqualTo("user@hospital.com");
    }

    @Test
    void verify_expiredSupabaseToken_throwsException() throws Exception {
        String token = createSupabaseToken("sub-supa-102", "user@hospital.com", "authenticated", Instant.now().minusSeconds(100));

        assertThatThrownBy(() -> provider.verify(token))
                .isInstanceOf(IdentityVerificationException.class);
    }

    private String createSupabaseToken(String subject, String email, String audience, Instant expiration) throws Exception {
        JWSSigner signer = new MACSigner(SECRET.getBytes());

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(subject)
                .issuer("https://demo.supabase.co/auth/v1")
                .audience(audience)
                .claim("email", email)
                .issueTime(Date.from(Instant.now()))
                .expirationTime(Date.from(expiration))
                .build();

        SignedJWT signedJWT = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(),
                claims);

        signedJWT.sign(signer);
        return signedJWT.serialize();
    }
}
