package com.cybelinx.platform.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.cybelinx.platform.api.persistence.UserIdentityRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthIdentity;
import com.cybelinx.platform.api.security.AuthPrincipal.AuthUser;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

/**
 * First-sign-in auto-provisioning against the real schema. The service writes in
 * {@code REQUIRES_NEW} (to keep the insert durable across unique-key races), so these tests
 * are deliberately non-transactional and re-baseline the tables before each method. The seeded
 * dev admin restored by the V21/V22 migrations is re-created after each method so running the
 * suite never wipes the local dev login.
 */
@SpringBootTest
class UserMappingServiceIT {

    @Autowired
    private UserMappingService userMapping;

    @Autowired
    private UserRepository users;

    @Autowired
    private UserIdentityRepository userIdentities;

    @Autowired
    private DataSource dataSource;

    @BeforeEach
    void cleanCommittedRows() {
        userIdentities.deleteAll();
        users.deleteAll();
    }

    @AfterEach
    void restoreDevSeedRows() throws Exception {
        // Idempotent re-apply of the seed migrations (guarded on natural keys),
        // restoring dev.admin@cybelinx.test, the ACME membership and platform-admin grant.
        try (java.sql.Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/migration/V22__ensure_dev_admin_user.sql"));
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/migration/V21__bootstrap_acme_login.sql"));
        }
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