package com.cybelinx.platform.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.cybelinx.platform.api.persistence.UserIdentityRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * First-sign-in auto-provisioning against the real schema. The service writes in
 * {@code REQUIRES_NEW} (to keep the insert durable across unique-key races), so these tests
 * are deliberately non-transactional and re-baseline the tables before each method.
 */
@SpringBootTest
class UserMappingServiceIT {

    @Autowired
    private UserMappingService userMapping;

    @Autowired
    private UserRepository users;

    @Autowired
    private UserIdentityRepository userIdentities;

    @BeforeEach
    void cleanCommittedRows() {
        userIdentities.deleteAll();
        users.deleteAll();
    }

    private static AuthIdentity identity(String subject, String email) {
        return new AuthIdentity("oidc", subject, email, "Alice Smith");
    }

    @Test
    void firstSignIn_provisionsPlatformUserAndIdentity() {
        AuthUser user = userMapping.resolveUser(identity("sub-first", "alice@example.com"));

        assertNotNull(user.id());
        assertEquals("alice@example.com", user.email());
        assertEquals("ACTIVE", user.status());
        assertEquals(1, users.count());
        assertEquals(1, userIdentities.count());
    }

    @Test
    void signInWithoutEmail_usesSyntheticEmail() {
        AuthUser user = userMapping.resolveUser(identity("sub-no-mail", null));

        assertEquals("sub-no-mail@oidc.invalid", user.email());
    }

    @Test
    void secondSignIn_reusesExistingMapping() {
        userMapping.resolveUser(identity("sub-repeat", "repeat@example.com"));

        AuthUser again = userMapping.resolveUser(identity("sub-repeat", "repeat@example.com"));

        assertEquals(1, users.count());
        assertEquals(1, userIdentities.count());
        assertEquals("repeat@example.com", again.email());
    }

    @Test
    void distinctSubjects_areDistinctPlatformUsers() {
        AuthUser a = userMapping.resolveUser(identity("sub-a", null));
        AuthUser b = userMapping.resolveUser(identity("sub-b", null));

        assertNotEquals(a.id(), b.id());
        assertEquals(2, users.count());
        assertEquals(2, userIdentities.count());
    }

    @Test
    void unmappedIdentity_lookupReturnsNull() {
        assertNull(userMapping.lookupUser(identity("never-seen", null)));
    }
}