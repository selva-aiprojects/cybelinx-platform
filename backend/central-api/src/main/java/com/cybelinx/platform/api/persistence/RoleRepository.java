package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code role} Prisma queries. */
public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByCode(String code);
}