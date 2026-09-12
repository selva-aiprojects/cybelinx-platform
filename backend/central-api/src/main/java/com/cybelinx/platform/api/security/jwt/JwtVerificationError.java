package com.cybelinx.platform.api.security.jwt;

/** Port of {@code JwtVerificationError}. */
public final class JwtVerificationError extends RuntimeException {

    private final JwtReason reason;

    public JwtVerificationError(JwtReason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public JwtVerificationError(JwtReason reason) {
        super("JWT verification failed: " + reason.name());
        this.reason = reason;
    }

    public JwtReason reason() {
        return reason;
    }
}