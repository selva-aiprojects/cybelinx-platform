package com.cybelinx.platform.api.auth;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.config.CybelinxProperties;
import com.cybelinx.platform.api.persistence.UserIdentityRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.persistence.entity.UserIdentity;
import com.cybelinx.platform.api.security.AuthorizationService;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Email+password login for the Admin Portal (migration V21).
 *
 * <p>Users are looked up by email. On a user's FIRST sign-in (when {@code password_hash} is NULL)
 * only the configured bootstrap password is accepted; it is then hashed with the running
 * {@link PasswordEncoder} and persisted, so every subsequent login requires a bcrypt match. On
 * success an HS256 JWT is minted (subject = the user's external identity, roles from memberships).
 */
@Service
public class LoginService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final UserRepository users;
    private final UserIdentityRepository userIdentities;
    private final AuthorizationService authorization;
    private final PasswordEncoder passwordEncoder;
    private final CybelinxProperties properties;
    private final JwtMinter minter;

    public LoginService(
            UserRepository users,
            UserIdentityRepository userIdentities,
            AuthorizationService authorization,
            PasswordEncoder passwordEncoder,
            CybelinxProperties properties,
            JwtMinter minter) {
        this.users = users;
        this.userIdentities = userIdentities;
        this.authorization = authorization;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.minter = minter;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = request.email() == null ? "" : request.email().trim().toLowerCase();
        String password = request.password();
        if (email.isEmpty()) {
            throw ApiHttpException.badRequest("Email is required");
        }
        if (password == null || password.isEmpty()) {
            throw ApiHttpException.badRequest("Password is required");
        }

        User user = users.findByEmail(email)
                .orElseThrow(() -> ApiHttpException.unauthorized(INVALID_CREDENTIALS));

        verifyPassword(user, password);

        String configuredProvider = properties.getIdp().getProvider();
        UserIdentity identity = userIdentities.findByUser(user).stream()
                .filter(item -> configuredProvider.equals(item.getIdentityProvider()))
                .findFirst()
                .orElseThrow(() -> ApiHttpException.unauthorized(
                        "User is not linked to the configured identity provider"));

        List<String> roles = authorization.listAccess(user.getId()).stream()
                .flatMap(entry -> entry.roles().stream())
                .distinct()
                .sorted()
                .toList();

        return minter.mintIdentityToken(identity.getExternalSubject(), user.getEmail(), roles);
    }

    private void verifyPassword(User user, String rawPassword) {
        String stored = user.getPasswordHash();
        if (stored == null) {
            bootstrapFirstLogin(user, rawPassword);
            return;
        }
        if (!passwordEncoder.matches(rawPassword, stored)) {
            throw ApiHttpException.unauthorized(INVALID_CREDENTIALS);
        }
    }

    private void bootstrapFirstLogin(User user, String rawPassword) {
        if (!properties.getAuth().getBootstrapPassword().equals(rawPassword)) {
            throw ApiHttpException.unauthorized(INVALID_CREDENTIALS);
        }
        int seeded = users.updatePasswordHashIfNull(user.getId(), passwordEncoder.encode(rawPassword));
        if (seeded == 0) {
            // Concurrent login won the seed race; validate against the hash it stored.
            User fresh = users.findById(user.getId())
                    .orElseThrow(() -> ApiHttpException.unauthorized(INVALID_CREDENTIALS));
            if (!passwordEncoder.matches(rawPassword, fresh.getPasswordHash())) {
                throw ApiHttpException.unauthorized(INVALID_CREDENTIALS);
            }
        }
    }
}