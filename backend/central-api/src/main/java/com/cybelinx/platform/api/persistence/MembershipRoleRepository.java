package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.MembershipRole;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code membershipRole} Prisma queries. */
public interface MembershipRoleRepository extends JpaRepository<MembershipRole, UUID> {
}