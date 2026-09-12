package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.RolePermission;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data port of the {@code rolePermission} Prisma queries. */
public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    /** Permission codes granted directly to a role. */
    @Query("select p.code from RolePermission rp join rp.permission p where rp.role.id = :roleId")
    List<String> findPermissionCodesForRole(@Param("roleId") UUID roleId);
}