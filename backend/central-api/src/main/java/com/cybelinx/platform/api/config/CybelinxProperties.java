package com.cybelinx.platform.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the platform-level configuration surfaced by {@code @cybelinx/config}
 * (IDP provider settings) as typed properties.
 */
@ConfigurationProperties(prefix = "cybelinx")
public class CybelinxProperties {

    private final Idp idp = new Idp();

    public Idp getIdp() {
        return idp;
    }

    public static class Idp {

        /** {@code IDP_PROVIDER} — label used to derive synthetic platform emails. */
        private String provider = "generic";

        /** {@code IDP_ISSUER} — expected JWT issuer claim (optional). */
        private String issuer;

        /** {@code IDP_AUDIENCE} — expected JWT audience claim (optional). */
        private String audience;

        /** {@code IDP_JWT_SECRET} — HMAC shared secret for signature verification (optional). */
        private String jwtSecret;

        /** {@code IDP_JWKS_URI} — remote JWKS endpoint for RSA/EC verification (optional). */
        private String jwksUri;

        /** {@code IDP_JWT_CLOCK_SKEW_SECONDS} — leeway for exp/nbf checks (0..300). */
        private long jwtClockSkewSeconds = 0;

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public String getAudience() {
            return audience;
        }

        public void setAudience(String audience) {
            this.audience = audience;
        }

        public String getJwtSecret() {
            return jwtSecret;
        }

        public void setJwtSecret(String jwtSecret) {
            this.jwtSecret = jwtSecret;
        }

        public String getJwksUri() {
            return jwksUri;
        }

        public void setJwksUri(String jwksUri) {
            this.jwksUri = jwksUri;
        }

        public long getJwtClockSkewSeconds() {
            return jwtClockSkewSeconds;
        }

        public void setJwtClockSkewSeconds(long jwtClockSkewSeconds) {
            this.jwtClockSkewSeconds = jwtClockSkewSeconds;
        }
    }
}