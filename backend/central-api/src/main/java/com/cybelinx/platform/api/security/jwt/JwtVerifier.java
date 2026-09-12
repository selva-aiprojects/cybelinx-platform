package com.cybelinx.platform.api.security.jwt;

import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Port of {@code JwtVerifier}: strict segment parsing, exact algorithm match, signature
 * verification through the configured {@link SignatureVerifier}, then claim validation
 * (sub/iss/aud/exp/nbf with clock skew).
 */
public final class JwtVerifier {

    private final String issuer;
    private final String audience;
    private final long clockSkewSeconds;
    private final SignatureVerifier signatureVerifier;

    public JwtVerifier(String issuer, String audience, long clockSkewSeconds, SignatureVerifier signatureVerifier) {
        this.issuer = issuer;
        this.audience = audience;
        this.clockSkewSeconds = clockSkewSeconds;
        this.signatureVerifier = signatureVerifier;
    }

    public String algorithm() {
        return signatureVerifier.algorithm();
    }

    public String kind() {
        return signatureVerifier.kind();
    }

    public VerifiedJwt verify(String token) {
        if (token == null || token.isEmpty()) {
            throw new JwtVerificationError(JwtReason.MALFORMED_TOKEN);
        }

        SignedJWT jwt;
        try {
            jwt = SignedJWT.parse(token);
        } catch (java.text.ParseException e) {
            throw new JwtVerificationError(JwtReason.MALFORMED_TOKEN);
        }

        String headerAlg = jwt.getHeader().getAlgorithm() == null ? null : jwt.getHeader().getAlgorithm().getName();
        if (!signatureVerifier.algorithm().equals(headerAlg)) {
            throw new JwtVerificationError(JwtReason.UNSUPPORTED_ALGORITHM, "Unsupported JWT algorithm: " + headerAlg);
        }

        boolean signatureValid = signatureVerifier.verify(jwt);
        if (!signatureValid) {
            throw new JwtVerificationError(JwtReason.SIGNATURE_INVALID);
        }

        Map<String, Object> claims = validateClaims(jwt);
        return new VerifiedJwt(token, headerAlg, jwt.getHeader().getKeyID(), claims);
    }

    private Map<String, Object> validateClaims(SignedJWT jwt) {
        Map<String, Object> claims;
        try {
            claims = jwt.getPayload().toJSONObject();
        } catch (Exception e) {
            claims = null;
        }
        if (claims == null || claims.isEmpty()) {
            throw new JwtVerificationError(JwtReason.MISSING_SUBJECT);
        }

        Object sub = claims.get("sub");
        if (!(sub instanceof String subject) || subject.isEmpty()) {
            throw new JwtVerificationError(JwtReason.MISSING_SUBJECT);
        }

        if (issuer != null && !issuer.isEmpty() && !issuer.equals(claims.get("iss"))) {
            throw new JwtVerificationError(JwtReason.INVALID_ISSUER);
        }

        if (audience != null && !audience.isEmpty()) {
            Object aud = claims.get("aud");
            boolean audienceMatches = aud instanceof String s
                    ? audience.equals(s)
                    : aud instanceof List<?> list && list.contains(audience);
            if (!audienceMatches) {
                throw new JwtVerificationError(JwtReason.INVALID_AUDIENCE);
            }
        }

        long now = Instant.now().getEpochSecond() - clockSkewSeconds;

        Object exp = claims.get("exp");
        if (exp instanceof Number expNumber && expNumber.longValue() <= now) {
            throw new JwtVerificationError(JwtReason.EXPIRED_TOKEN);
        }

        Object nbf = claims.get("nbf");
        if (nbf instanceof Number nbfNumber && nbfNumber.longValue() > now) {
            throw new JwtVerificationError(JwtReason.TOKEN_NOT_YET_VALID);
        }

        return claims;
    }

    /** Port of {@code VerifiedJwt}. */
    public record VerifiedJwt(String token, String alg, String kid, Map<String, Object> claims) {}
}