package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code user} Prisma queries. */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);
}