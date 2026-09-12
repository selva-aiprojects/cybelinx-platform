-- Tenant lifecycle statuses
-- PROSPECT / DEACTIVATING / ARCHIVED are replaced by DEACTIVATED,
-- DELETION_PENDING and DELETED to express the soft, deferred deletion
-- lifecycle: DELETION_PENDING → DELETED (row retained).
--
-- Only dev-seed rows exist (status ACTIVE), so dropping the removed
-- enum variants is safe here.

ALTER TYPE "TenantStatus" RENAME TO "TenantStatus_old";

CREATE TYPE "TenantStatus" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
  'DELETION_PENDING',
  'DELETED'
);

ALTER TABLE "tenants" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "tenants"
  ALTER COLUMN "status" TYPE "TenantStatus"
  USING ("status"::text::"TenantStatus");

ALTER TABLE "tenants" ALTER COLUMN "status" SET DEFAULT 'PROVISIONING';

DROP TYPE "TenantStatus_old";