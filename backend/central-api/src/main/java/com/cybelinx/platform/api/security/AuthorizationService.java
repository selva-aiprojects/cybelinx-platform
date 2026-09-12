package com.cybelinx.platform.api.security;

import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Port of {@code AuthorizationService}: flattens ACTIVE memberships into role/permission access
 * entries for a user.
 */
@Service
public class AuthorizationService {

    public static final String PLATFORM_ADMIN_ROLE = "CYBELINX_PLATFORM_ADMIN";

    private final TenantMembershipRepository memberships;

    public AuthorizationService(TenantMembershipRepository memberships) {
        this.memberships = memberships;
    }

    /** Port of {@code AuthorizationService.listAccess()}. */
    @Transactional(readOnly = true)
    public List<PlatformAccess> listAccess(UUID userId) {
        Map<UUID, AccessAccumulator> byMembership = new LinkedHashMap<>();

        for (Object[] row : memberships.listMembershipRoles(userId)) {
            UUID membershipId = (UUID) row[0];
            UUID tenantId = (UUID) row[1];
            String roleCode = (String) row[2];
            byMembership.computeIfAbsent(membershipId, id -> new AccessAccumulator(membershipId, tenantId)).roles.add(roleCode);
        }

        for (Object[] row : memberships.listMembershipPermissions(userId)) {
            UUID membershipId = (UUID) row[0];
            String permissionCode = (String) row[1];
            AccessAccumulator acc = byMembership.get(membershipId);
            if (acc != null) {
                acc.permissions.add(permissionCode);
            }
        }

        return byMembership.values().stream()
                .map(acc -> new PlatformAccess(acc.membershipId, acc.tenantId, List.copyOf(acc.roles), List.copyOf(acc.permissions)))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isPlatformAdmin(UUID userId) {
        return listAccess(userId).stream().anyMatch(entry -> entry.roles().contains(PLATFORM_ADMIN_ROLE));
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String permission) {
        return listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(PLATFORM_ADMIN_ROLE) || entry.permissions().contains(permission));
    }

    /** Port of {@code PlatformAccess}. */
    public record PlatformAccess(UUID membershipId, UUID tenantId, List<String> roles, List<String> permissions) {}

    private static final class AccessAccumulator {
        private final UUID membershipId;
        private final UUID tenantId;
        private final Set<String> roles = new LinkedHashSet<>();
        private final Set<String> permissions = new LinkedHashSet<>();

        private AccessAccumulator(UUID membershipId, UUID tenantId) {
            this.membershipId = membershipId;
            this.tenantId = tenantId;
        }
    }
}