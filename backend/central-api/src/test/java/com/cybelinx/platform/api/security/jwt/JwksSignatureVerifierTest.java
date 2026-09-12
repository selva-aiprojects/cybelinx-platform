package com.cybelinx.platform.api.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Port of {@code jwks} verification coverage from {@code jwt-verifier.spec.ts}. */
class JwksSignatureVerifierTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void verifiesTokenSignedByServedKey() throws Exception {
        RSAKey signingKey = new RSAKeyGenerator(2048).keyID("platform-key").generate();
        RSAKey publicKey = signingKey.toPublicJWK();
        serveJWKS(new JWKSet(publicKey).toString(), 200);

        JwtVerifier verifier =
                new JwtVerifier("", "", 0, new JwksSignatureVerifier(baseUrl() + "/jwks"));
        String token = rs256(signingKey, "platform-key");
        assertThat(verifier.verify(token).claims().get("sub")).isEqualTo("user-123");
    }

    @Test
    void tokenSignedByUnknownKey_isRejected() throws Exception {
        RSAKey signingKey = new RSAKeyGenerator(2048).keyID("untrusted-key").generate();
        RSAKey trustedKey = new RSAKeyGenerator(2048).keyID("platform-key").generate();
        serveJWKS(new JWKSet(trustedKey.toPublicJWK()).toString(), 200);

        JwksSignatureVerifier signatureVerifier = new JwksSignatureVerifier(baseUrl() + "/jwks");
        String token = rs256(signingKey, "untrusted-key");
        assertThat(signatureVerifier.verify(SignedJWT.parse(token))).isFalse();
    }

    @Test
    void tokenWithSingleServedKeyAndNoKid_isAccepted() throws Exception {
        RSAKey signingKey = new RSAKeyGenerator(2048).generate();
        serveJWKS(new JWKSet(signingKey.toPublicJWK()).toString(), 200);

        JwtVerifier verifier = new JwtVerifier("", "", 0, new JwksSignatureVerifier(baseUrl() + "/jwks"));
        String token = rs256(signingKey, null);
        assertThat(verifier.verify(token).claims().get("sub")).isEqualTo("user-123");
    }

    @Test
    void failedFetch_raisesSignatureInvalid() throws Exception {
        RSAKey signingKey = new RSAKeyGenerator(2048).generate();
        serveJWKS("boom", 500);

        JwksSignatureVerifier signatureVerifier = new JwksSignatureVerifier(baseUrl() + "/jwks");
        String token = rs256(signingKey, null);
        assertThatThrownBy(() -> signatureVerifier.verify(SignedJWT.parse(token)))
                .isInstanceOf(JwtVerificationError.class)
                .satisfies(error -> assertThat(((JwtVerificationError) error).reason())
                        .isEqualTo(JwtReason.SIGNATURE_INVALID));
    }

    @Test
    void cachesKeysAcrossCalls() throws Exception {
        RSAKey signingKey = new RSAKeyGenerator(2048).keyID("cached-key").generate();
        serveJWKS(new JWKSet(signingKey.toPublicJWK()).toString(), 200);
        String jwksUrl = baseUrl() + "/jwks";
        JwtVerifier verifier = new JwtVerifier("", "", 0, new JwksSignatureVerifier(jwksUrl));

        String first = rs256(signingKey, "cached-key");
        String second = rs256(signingKey, "cached-key");
        assertThat(verifier.verify(first).claims().get("sub")).isEqualTo("user-123");
        assertThat(verifier.verify(second).claims().get("sub")).isEqualTo("user-123");
    }

    private void serveJWKS(String payload, int status) throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/jwks", exchange -> {
            byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().put("Content-Type", List.of("application/json"));
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
    }

    private String baseUrl() {
        return "http://localhost:" + server.getAddress().getPort();
    }

    private static String rs256(RSAKey signingKey, String kid) throws Exception {
        JWSHeader.Builder headerBuilder = new JWSHeader.Builder(JWSAlgorithm.RS256);
        if (kid != null) {
            headerBuilder.keyID(kid);
        }
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build();
        SignedJWT jwt = new SignedJWT(headerBuilder.build(), claims);
        jwt.sign(new RSASSASigner(signingKey));
        return jwt.serialize();
    }
}