package com.cybelinx.platform.api.security.jwt;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;

/** Port of {@code HmacTokenSignatureVerifier} (HS256 with a shared secret). */
public final class HmacSignatureVerifier implements SignatureVerifier {

    private final MACVerifier verifier;

    public HmacSignatureVerifier(String secret) {
        try {
            this.verifier = new MACVerifier(secret.getBytes(StandardCharsets.UTF_8));
        } catch (JOSEException e) {
            throw new IllegalArgumentException("Invalid HMAC secret", e);
        }
    }

    @Override
    public String algorithm() {
        return "HS256";
    }

    @Override
    public String kind() {
        return "hmac";
    }

    @Override
    public boolean verify(SignedJWT jwt) {
        try {
            return jwt.verify(verifier);
        } catch (JOSEException e) {
            return false;
        }
    }
}