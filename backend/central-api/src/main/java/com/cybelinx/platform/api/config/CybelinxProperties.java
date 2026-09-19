package com.cybelinx.platform.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the platform-level configuration surfaced by {@code @cybelinx/config}
 * (IDP provider settings) as typed properties.
 */
@ConfigurationProperties(prefix = "cybelinx")
public class CybelinxProperties {

    private final Idp idp = new Idp();
    private final Auth auth = new Auth();

    public Idp getIdp() {
        return idp;
    }

    public Auth getAuth() {
        return auth;
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

    /** Email+password login configuration (see migration V21). */
    public static class Auth {

        /**
         * {@code CYBELINX_AUTH_BOOTSTRAP_PASSWORD} — accepted on a user's FIRST sign-in only,
         * hashed with BCrypt and persisted; all later sign-ins need the stored hash to match.
         */
        private String bootstrapPassword = "Admin@123";

        /** {@code CYBELINX_AUTH_TOKEN_TTL_HOURS} — lifetime of the minted portal JWT. */
        private long tokenTtlHours = 24;

        public String getBootstrapPassword() {
            return bootstrapPassword;
        }

        public void setBootstrapPassword(String bootstrapPassword) {
            this.bootstrapPassword = bootstrapPassword;
        }

        public long getTokenTtlHours() {
            return tokenTtlHours;
        }

        public void setTokenTtlHours(long tokenTtlHours) {
            this.tokenTtlHours = tokenTtlHours;
        }
    }
}