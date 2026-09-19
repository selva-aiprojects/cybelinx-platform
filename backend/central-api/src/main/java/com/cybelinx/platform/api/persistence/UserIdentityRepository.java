package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.User;
import com.cybelinx.platform.api.persistence.entity.UserIdentity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code userIdentity} Prisma queries. */
public interface UserIdentityRepository extends JpaRepository<UserIdentity, UUID> {

    Optional<UserIdentity> findByIdentityProviderAndExternalSubject(String identityProvider, String externalSubject);

    List<UserIdentity> findByUser(User user);
}