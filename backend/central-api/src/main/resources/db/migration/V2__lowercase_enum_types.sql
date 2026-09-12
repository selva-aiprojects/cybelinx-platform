-- V1 created Prisma-style quoted PascalCase enum type names (public."MembershipStatus").
-- Hibernate maps @JdbcTypeCode(SqlTypes.NAMED_ENUM) fields by casting with the
-- unquoted Java enum class name (e.g. 'ACTIVE'::MembershipStatus). PostgreSQL
-- resolves unquoted identifiers to lowercase, so a type named "MembershipStatus"
-- is invisible. Rename every PG enum type to its lowercase form so the unquoted
-- casts resolve. Column definitions that reference the type follow the rename.

ALTER TYPE public."DatabaseStatus" RENAME TO databasestatus;
ALTER TYPE public."EntitlementStatus" RENAME TO entitlementstatus;
ALTER TYPE public."Environment" RENAME TO environment;
ALTER TYPE public."EventStatus" RENAME TO eventstatus;
ALTER TYPE public."IsolationMode" RENAME TO isolationmode;
ALTER TYPE public."MembershipStatus" RENAME TO membershipstatus;
ALTER TYPE public."PlanStatus" RENAME TO planstatus;
ALTER TYPE public."ProductStatus" RENAME TO productstatus;
ALTER TYPE public."ProvisioningOperation" RENAME TO provisioningoperation;
ALTER TYPE public."ProvisioningState" RENAME TO provisioningstate;
ALTER TYPE public."ProvisioningStepStatus" RENAME TO provisioningstepstatus;
ALTER TYPE public."ResourceStatus" RENAME TO resourcestatus;
ALTER TYPE public."RoleScope" RENAME TO rolescope;
ALTER TYPE public."TenantProductStatus" RENAME TO tenantproductstatus;
ALTER TYPE public."TenantResourceStatus" RENAME TO tenantresourcestatus;
ALTER TYPE public."TenantStatus" RENAME TO tenantstatus;
ALTER TYPE public."UserStatus" RENAME TO userstatus;