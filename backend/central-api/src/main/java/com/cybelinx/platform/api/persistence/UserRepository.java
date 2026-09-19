package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Spring Data port of the {@code user} Prisma queries. */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    /**
     * Seeds a password hash only when the user has none yet (first-login bootstrap). Returns the
     * number of rows updated; {@code 0} means a concurrent login already seeded the hash.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.passwordHash = :passwordHash WHERE u.id = :id AND u.passwordHash IS NULL")
    int updatePasswordHashIfNull(UUID id, String passwordHash);
}