package com.cybelinx.platform.api.security.jwt;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

/**
 * Port of {@code JwksTokenSignatureVerifier} (RS256 verified against a remote JWKS endpoint,
 * keys cached for 5 minutes).
 */
public final class JwksSignatureVerifier implements SignatureVerifier {

    private static final long TTL_MILLIS = 5 * 60 * 1000L;

    private final String jwksUri;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private List<RSAKey> keys;
    private long loadedAt;

    public JwksSignatureVerifier(String jwksUri) {
        this.jwksUri = jwksUri;
    }

    @Override
    public String algorithm() {
        return "RS256";
    }

    @Override
    public String kind() {
        return "jwks";
    }

    @Override
    public boolean verify(SignedJWT jwt) {
        List<RSAKey> loaded;
        try {
            loaded = loadKeys();
        } catch (Exception e) {
            throw new JwtVerificationError(JwtReason.SIGNATURE_INVALID, "Unable to load JWKS keys");
        }

        String kid = jwt.getHeader().getKeyID();
        RSAKey key;
        if (kid != null) {
            key = loaded.stream().filter(candidate -> kid.equals(candidate.getKeyID())).findFirst().orElse(null);
        } else {
            key = loaded.size() == 1 ? loaded.get(0) : null;
        }
        if (key == null || key.getKeyType() == null || key.getModulus() == null || key.getPublicExponent() == null) {
            return false;
        }

        try {
            return jwt.verify(new RSASSAVerifier(key));
        } catch (JOSEException e) {
            return false;
        }
    }

    private synchronized List<RSAKey> loadKeys() throws Exception {
        if (keys != null && System.currentTimeMillis() - loadedAt < TTL_MILLIS) {
            return keys;
        }
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(jwksUri)).timeout(Duration.ofSeconds(10)).GET().build();
        HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("JWKS fetch failed: " + response.statusCode());
        }
        JWKSet jwkSet = JWKSet.parse(new String(response.body(), StandardCharsets.UTF_8));
        this.keys = jwkSet.getKeys().stream()
                .filter(RSAKey.class::isInstance)
                .map(RSAKey.class::cast)
                .toList();
        this.loadedAt = System.currentTimeMillis();
        return keys;
    }
}