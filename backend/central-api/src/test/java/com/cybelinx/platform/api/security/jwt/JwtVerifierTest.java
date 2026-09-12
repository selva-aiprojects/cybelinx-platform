package com.cybelinx.platform.api.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;

/** Port of {@code jwt-verifier.spec.ts}. */
class JwtVerifierTest {

    private static final String SECRET = "test-identity-secret-for-hmac-signing";

    private static String hmacToken(
            JWSAlgorithm algorithm,
            JWSHeader header,
            JWTClaimsSet claims,
            String secret) throws Exception {
        SignedJWT jwt = new SignedJWT(header, claims);
        jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }

    private static JWTClaimsSet claims(Instant expiresAt, Instant notBefore) {
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .subject("user-123")
                .expirationTime(Date.from(expiresAt));
        if (notBefore != null) {
            builder.notBeforeTime(Date.from(notBefore));
        }
return builder.build();
    }

    @Test
    void validHmacToken_verifies() throws Exception {
        JWTClaimsSet claims = claims(
                Instant.now().plusSeconds(3600), Instant.now().minusSeconds(30));
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        JwtVerifier.VerifiedJwt verified = verifier.verify(token);

        assertThat(verified.alg()).isEqualTo("HS256");
        assertThat(verified.claims().get("sub")).isEqualTo("user-123");
    }

    @Test
    void unsupportedAlgorithm_isRejected() throws Exception {
        RSAKey key = new RSAKeyGenerator(2048).generate();
        JWTClaimsSet claims = claims(
                Instant.now().plusSeconds(3600), Instant.now().minusSeconds(30));
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).build(), claims);
        jwt.sign(new RSASSASigner(key));

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(jwt.serialize()))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.UNSUPPORTED_ALGORITHM));
    }

    @Test
    void invalidSignature_isRejected() throws Exception {
        JWTClaimsSet claims = claims(
                Instant.now().plusSeconds(3600), Instant.now().minusSeconds(30));
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, "a-different-longer-signing-secret-for-tests");

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.SIGNATURE_INVALID));
    }

    @Test
    void missingSubject_isRejected() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.MISSING_SUBJECT));
    }

    @Test
    void missingOrMismatchedIssuer_isRejected() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .issuer("https://other-issuer.example")
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("https://issuer.example", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.INVALID_ISSUER));
    }

    @Test
    void missingOrMismatchedAudience_isRejected() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .audience("https://wrong-audience.example")
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "https://cybelinx.example", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.INVALID_AUDIENCE));
    }

    @Test
    void audienceListContainingExpectedPasses() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .audience(java.util.List.of("https://cybelinx.example"))
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "https://cybelinx.example", 0, new HmacSignatureVerifier(SECRET));
        assertThat(verifier.verify(token).claims().get("sub")).isEqualTo("user-123");
    }

    @Test
    void expiredToken_isRejected() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .expirationTime(Date.from(Instant.now().minusSeconds(300)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.EXPIRED_TOKEN));
    }

    @Test
    void notBeforeInTheFuture_isRejected() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .notBeforeTime(Date.from(Instant.now().plusSeconds(300)))
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.TOKEN_NOT_YET_VALID));
    }

    @Test
    void clockSkew_toleratesJustExpiredTokens() throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .expirationTime(Date.from(Instant.now().minusSeconds(10)))
                .build();
        String token = hmacToken(
                JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);

        JwtVerifier verifier = new JwtVerifier("", "", 60, new HmacSignatureVerifier(SECRET));
        assertThat(verifier.verify(token).claims().get("sub")).isEqualTo("user-123");
    }

    @Test
    void malformedToken_isRejected() {
        JwtVerifier verifier = new JwtVerifier("", "", 0, new HmacSignatureVerifier(SECRET));
        assertThatThrownBy(() -> verifier.verify("not-a-jwt"))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.MALFORMED_TOKEN));
    }

    @Test
    void unconfiguredVerifier_rejectsWithNotConfigured() {
        String token;
        try {
            JWTClaimsSet claims = claims(
                    Instant.now().plusSeconds(3600), Instant.now().minusSeconds(30));
            token = hmacToken(JWSAlgorithm.HS256, new JWSHeader(JWSAlgorithm.HS256), claims, SECRET);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        JwtVerifier verifier =
                new JwtVerifier("", "", 0, new UnconfiguredSignatureVerifier());
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.NOT_CONFIGURED));
    }
}