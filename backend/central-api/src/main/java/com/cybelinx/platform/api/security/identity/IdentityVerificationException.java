package com.cybelinx.platform.api.security.identity;

import com.cybelinx.platform.api.security.jwt.JwtReason;

/** Raised when the identity provider rejects a token (algorithm, signature or claims). */
public final class IdentityVerificationException extends RuntimeException {

    private final JwtReason reason;

    public IdentityVerificationException(JwtReason reason, String message) {
        super(message != null ? message : reason.name());
        this.reason = reason;
    }

    public JwtReason reason() {
        return reason;
    }
}