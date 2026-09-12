package com.cybelinx.platform.api.config;

import com.cybelinx.platform.api.security.IdentityService;
import com.cybelinx.platform.api.security.UserMappingService;
import com.cybelinx.platform.api.security.jwt.HmacSignatureVerifier;
import com.cybelinx.platform.api.security.jwt.JwtVerifier;
import com.cybelinx.platform.api.security.jwt.JwksSignatureVerifier;
import com.cybelinx.platform.api.security.jwt.SignatureVerifier;
import com.cybelinx.platform.api.security.jwt.UnconfiguredSignatureVerifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Port of the {@code IdentityModule} provider wiring: chooses the JWT signature verifier from
 * {@code cybelinx.idp.jwt-secret} / {@code cybelinx.idp.jwks-uri} and builds the identity service.
 */
@Configuration
public class IdentitySecurityConfig {

    @Bean
    public JwtVerifier jwtVerifier(CybelinxProperties properties) {
        CybelinxProperties.Idp idp = properties.getIdp();
        String issuer = blankToNull(idp.getIssuer());
        String audience = blankToNull(idp.getAudience());

        SignatureVerifier verifier;
        if (hasText(idp.getJwtSecret())) {
            verifier = new HmacSignatureVerifier(idp.getJwtSecret());
        } else if (hasText(idp.getJwksUri())) {
            verifier = new JwksSignatureVerifier(idp.getJwksUri());
        } else {
            verifier = new UnconfiguredSignatureVerifier();
        }

        return new JwtVerifier(issuer, audience, idp.getJwtClockSkewSeconds(), verifier);
    }

    @Bean
    public IdentityService identityService(CybelinxProperties properties, JwtVerifier jwtVerifier, UserMappingService userMapping) {
        String provider = hasText(properties.getIdp().getProvider()) ? properties.getIdp().getProvider() : "generic";
        return new IdentityService(provider, jwtVerifier, userMapping);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return hasText(value) ? value : null;
    }
}