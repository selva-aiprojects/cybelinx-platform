package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.TenantMembership;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code tenantMembership} Prisma queries. */
public interface TenantMembershipRepository extends JpaRepository<TenantMembership, UUID> {

    /**
     * Memberships of a tenant with their role grants. Returns {@link Object[]} rows of
     * {@code [TenantMembership, String roleCode|null]} so no collection fetch is required.
     */
    @Query(
            "select m, mr.role.code from TenantMembership m left join m.memberRoles mr "
                    + "where m.tenant.id = :tenantId order by m.createdAt asc")
    List<Object[]> listByTenantWithRoleCodes(@Param("tenantId") UUID tenantId);

    /** Role codes per ACTIVE membership: rows of {@code [membershipId, tenantId, roleCode]}. */
    @Query(
            "select m.id, m.tenant.id, mr.role.code from TenantMembership m join m.memberRoles mr "
                    + "where m.user.id = :userId and m.status = com.cybelinx.platform.api.domain.MembershipStatus.ACTIVE")
    List<Object[]> listMembershipRoles(@Param("userId") UUID userId);

    /** Permission codes per ACTIVE membership: rows of {@code [membershipId, permissionCode]}. */
    @Query(
            "select m.id, rp.permission.code from TenantMembership m "
                    + "join m.memberRoles mr join mr.role r "
                    + "join RolePermission rp on rp.role = r "
                    + "where m.user.id = :userId and m.status = com.cybelinx.platform.api.domain.MembershipStatus.ACTIVE")
    List<Object[]> listMembershipPermissions(@Param("userId") UUID userId);

    java.util.Optional<TenantMembership> findByTenant_IdAndUser_Id(UUID tenantId, UUID userId);
}