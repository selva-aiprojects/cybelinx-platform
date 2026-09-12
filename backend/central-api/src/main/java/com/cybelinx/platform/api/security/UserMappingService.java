package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.domain.UserStatus;
import com.cybelinx.platform.api.persistence.UserIdentityRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.persistence.entity.UserIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthUser;
import com.cybelinx.platform.api.security.AuthPrincipal.PlatformUserIdentity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Port of {@code UserMappingService}: looks up the platform user for an external identity and
 * creates the mapping (and backing user) on first sign-in, mirroring the Prisma upsert.
 */
@Service
public class UserMappingService {

    private final UserRepository users;
    private final UserIdentityRepository userIdentities;

    public UserMappingService(UserRepository users, UserIdentityRepository userIdentities) {
        this.users = users;
        this.userIdentities = userIdentities;
    }

    @Transactional(readOnly = true)
    public AuthUser lookupUser(AuthIdentity identity) {
        return userIdentities
                .findByIdentityProviderAndExternalSubject(identity.provider(), identity.subject())
                .map(UserIdentity::getUser)
                .map(UserMappingService::toAuthUser)
                .orElse(null);
    }

    /** Port of {@code UserMappingService.createMapping()} (upsert on the provider+subject unique key). */
    @Transactional
    public Mapping createMapping(AuthIdentity identity) {
        String email = identity.email();

        var existing = userIdentities.findByIdentityProviderAndExternalSubject(identity.provider(), identity.subject());
        if (existing.isPresent()) {
            UserIdentity record = existing.get();
            record.setEmail(email);
            UserIdentity saved = userIdentities.save(record);
            return new Mapping(toAuthUser(saved.getUser()), toPlatformUserIdentity(saved));
        }

        String syntheticEmail = email != null ? email : identity.subject() + "@" + identity.provider().toLowerCase() + ".invalid";

        User user = new User();
        user.setEmail(syntheticEmail);
        user.setDisplayName(identity.name() != null ? identity.name() : "New User");
        user.setStatus(UserStatus.ACTIVE);
        User savedUser = users.save(user);

        UserIdentity record = new UserIdentity();
        record.setUser(savedUser);
        record.setIdentityProvider(identity.provider());
        record.setExternalSubject(identity.subject());
        record.setEmail(email);
        record.setPrimary(true);
        UserIdentity saved = userIdentities.save(record);

        return new Mapping(toAuthUser(savedUser), toPlatformUserIdentity(saved));
    }

    private static AuthUser toAuthUser(User user) {
        return new AuthUser(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getStatus().name(),
                user.getLocale(),
                user.getTimezone());
    }

    private static PlatformUserIdentity toPlatformUserIdentity(UserIdentity record) {
        return new PlatformUserIdentity(
                record.getId(),
                record.getUser().getId(),
                record.getIdentityProvider(),
                record.getExternalSubject(),
                record.getEmail(),
                record.isPrimary());
    }

    /** Port of {@code createUserMapping()} result {@code {user, identity}}. */
    public record Mapping(AuthUser user, PlatformUserIdentity identity) {}
}