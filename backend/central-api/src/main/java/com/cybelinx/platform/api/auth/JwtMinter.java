package com.cybelinx.platform.api.auth;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.config.CybelinxProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Signs HS256 portal JWTs for the email+password login, using the same {@code cybelinx.idp.jwt-secret}
 * (env {@code IDP_JWT_SECRET}) that {@code HmacSignatureVerifier} later accepts. The subject claim is
 * the user's external identity subject so the standard {@code IdentityService} flow maps the token
 * straight back to the user.
 */
@Component
public class JwtMinter {

    private final String secret;
    private final String issuer;
    private final String audience;
    private final long ttlSeconds;

    public JwtMinter(CybelinxProperties properties) {
        this.secret = properties.getIdp().getJwtSecret();
        this.issuer = blankToNull(properties.getIdp().getIssuer());
        this.audience = blankToNull(properties.getIdp().getAudience());
        this.ttlSeconds = Math.max(1, properties.getAuth().getTokenTtlHours()) * 3600;
    }

    public LoginResponse mintIdentityToken(String subject, String email, List<String> roles) {
        if (secret == null || secret.isBlank()) {
            throw ApiHttpException.serverError(
                    "IDP_JWT_SECRET is not configured; the portal login cannot mint tokens");
        }

        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        MACSigner signer;
        try {
            signer = new MACSigner(key);
        } catch (JOSEException e) {
            throw ApiHttpException.serverError(
                    "IDP_JWT_SECRET must be at least 256 bits (32+ bytes) for HS256 signing");
        }

        long now = Instant.now().getEpochSecond();
        long exp = now + ttlSeconds;
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .subject(subject)
                .claim("email", email)
                .claim("roles", roles)
                .issueTime(Date.from(Instant.ofEpochSecond(now)))
                .expirationTime(Date.from(Instant.ofEpochSecond(exp)));
        if (issuer != null) {
            builder.issuer(issuer);
        }
        if (audience != null) {
            builder.audience(audience);
        }

        JWTClaimsSet claims = builder.build();

        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        try {
            jwt.sign(signer);
        } catch (JOSEException e) {
            throw ApiHttpException.serverError("Failed to sign the login token");
        }

        return new LoginResponse(jwt.serialize(), subject, email, roles, Instant.ofEpochSecond(exp), true);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}