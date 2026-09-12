-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PROSPECT', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "IsolationMode" AS ENUM ('SHARED_POOL', 'SCHEMA_PER_TENANT', 'DEDICATED_DATABASE', 'DEDICATED_INFRASTRUCTURE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantProductStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'LAPSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'TENANT');

-- CreateEnum
CREATE TYPE "DatabaseStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'PROVISIONING', 'DEGRADED', 'DISABLED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TenantResourceStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DEGRADED', 'FAILED', 'RETIRED');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ProvisioningOperation" AS ENUM ('PROVISION', 'REPROVISION', 'UPGRADE', 'SUSPEND', 'RESUME', 'DEPROVISION');

-- CreateEnum
CREATE TYPE "ProvisioningState" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ProvisioningStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(10),
    "timezone" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "identity_provider" VARCHAR(64) NOT NULL,
    "external_subject" VARCHAR(512) NOT NULL,
    "email" VARCHAR(320),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "region_code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "tenant_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'PROSPECT',
    "region_id" UUID,
    "country" VARCHAR(2),
    "timezone" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invited_by_id" UUID,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_external_identifiers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID,
    "provider" VARCHAR(64) NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_external_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "scope" "RoleScope" NOT NULL DEFAULT 'TENANT',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "product_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_versions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "release_notes" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "trial_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "name" VARCHAR(120),
    "value" JSONB,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "TenantProductStatus" NOT NULL DEFAULT 'PROVISIONING',
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_catalog" (
    "id" UUID NOT NULL,
    "resource_type_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "databases" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "port" INTEGER,
    "region_id" UUID,
    "status" "DatabaseStatus" NOT NULL DEFAULT 'PROVISIONING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_schemas" (
    "id" UUID NOT NULL,
    "database_id" UUID NOT NULL,
    "region_id" UUID,
    "schema_name" VARCHAR(128) NOT NULL,
    "environment" "Environment",
    "status" "DatabaseStatus" NOT NULL DEFAULT 'PROVISIONING',
    "migration_version" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_resources" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "isolation_mode" "IsolationMode" NOT NULL,
    "database_id" UUID,
    "schema_id" UUID,
    "schema_name" VARCHAR(128),
    "region_id" UUID,
    "environment" "Environment" NOT NULL DEFAULT 'DEVELOPMENT',
    "status" "TenantResourceStatus" NOT NULL DEFAULT 'PENDING',
    "provisioning_state" "ProvisioningState" NOT NULL DEFAULT 'PENDING',
    "migration_version" VARCHAR(32),
    "credential_reference" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_product_id" UUID,

    CONSTRAINT "tenant_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_product_id" UUID,
    "tenant_resource_id" UUID,
    "operation" "ProvisioningOperation" NOT NULL,
    "state" "ProvisioningState" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "requested_by_id" UUID,
    "error_code" VARCHAR(128),
    "error_message" TEXT,
    "queued_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provisioning_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_steps" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "ProvisioningStepStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provisioning_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "product_id" UUID,
    "actor_type" VARCHAR(16) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" VARCHAR(64),
    "request_id" VARCHAR(64),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "schema_version" VARCHAR(16) NOT NULL DEFAULT '1.0',
    "tenant_id" UUID,
    "product_id" UUID,
    "entity_type" VARCHAR(64),
    "entity_id" UUID,
    "correlation_id" VARCHAR(64),
    "aggregate_id" UUID,
    "payload" JSONB,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_processing" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "worker_id" VARCHAR(64) NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "lease_expires_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_processing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_definitions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "channels" JSONB NOT NULL,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID,
    "resource_id" UUID,
    "event_type" VARCHAR(128) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "unit" VARCHAR(32),
    "metadata" JSONB,
    "dedupe_key" VARCHAR(255),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_identity_provider_external_subject_key" ON "user_identities"("identity_provider", "external_subject");

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_code_key" ON "regions"("region_code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_region_id_idx" ON "tenants"("region_id");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_status_idx" ON "tenant_memberships"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "tenant_external_ids_tenant_id_idx" ON "tenant_external_identifiers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_external_identifiers_tenant_id_product_id_provider_key" ON "tenant_external_identifiers"("tenant_id", "product_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_external_identifiers_provider_product_id_external_id_key" ON "tenant_external_identifiers"("provider", "product_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "membership_roles_role_id_idx" ON "membership_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_roles_membership_id_role_id_key" ON "membership_roles"("membership_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_current_version_id_key" ON "products"("current_version_id");

-- CreateIndex
CREATE INDEX "product_versions_product_iscurrent_idx" ON "product_versions"("product_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "product_versions_product_id_version_key" ON "product_versions"("product_id", "version");

-- CreateIndex
CREATE INDEX "plans_product_status_idx" ON "plans"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_product_id_plan_code_key" ON "plans"("product_id", "plan_code");

-- CreateIndex
CREATE INDEX "entitlements_plan_status_idx" ON "entitlements"("plan_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_plan_id_key_key" ON "entitlements"("plan_id", "key");

-- CreateIndex
CREATE INDEX "tenant_products_tenant_status_idx" ON "tenant_products"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tenant_products_product_id_idx" ON "tenant_products"("product_id");

-- CreateIndex
CREATE INDEX "tenant_products_plan_id_idx" ON "tenant_products"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_products_tenant_id_product_id_key" ON "tenant_products"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_catalog_resource_type_code_key" ON "resource_catalog"("resource_type_code");

-- CreateIndex
CREATE INDEX "databases_status_idx" ON "databases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "databases_region_id_name_key" ON "databases"("region_id", "name");

-- CreateIndex
CREATE INDEX "database_schemas_region_id_idx" ON "database_schemas"("region_id");

-- CreateIndex
CREATE INDEX "database_schemas_status_idx" ON "database_schemas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "database_schemas_database_id_schema_name_key" ON "database_schemas"("database_id", "schema_name");

-- CreateIndex
CREATE INDEX "tenant_resources_tenant_product_idx" ON "tenant_resources"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "tenant_resources_tenant_status_idx" ON "tenant_resources"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tenant_resources_product_id_idx" ON "tenant_resources"("product_id");

-- CreateIndex
CREATE INDEX "tenant_resources_database_id_idx" ON "tenant_resources"("database_id");

-- CreateIndex
CREATE INDEX "tenant_resources_region_id_idx" ON "tenant_resources"("region_id");

-- CreateIndex
CREATE INDEX "tenant_resources_status_idx" ON "tenant_resources"("status");

-- CreateIndex
CREATE INDEX "tenant_resources_provisioning_state_idx" ON "tenant_resources"("provisioning_state");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_resources_tenant_id_product_id_environment_resource__key" ON "tenant_resources"("tenant_id", "product_id", "environment", "resource_id");

-- CreateIndex
CREATE INDEX "provisioning_jobs_tenant_id_idx" ON "provisioning_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "provisioning_jobs_tenant_product_id_idx" ON "provisioning_jobs"("tenant_product_id");

-- CreateIndex
CREATE INDEX "provisioning_jobs_tenant_resource_id_idx" ON "provisioning_jobs"("tenant_resource_id");

-- CreateIndex
CREATE INDEX "provisioning_jobs_state_idx" ON "provisioning_jobs"("state");

-- CreateIndex
CREATE INDEX "provisioning_jobs_created_at_idx" ON "provisioning_jobs"("created_at");

-- CreateIndex
CREATE INDEX "provisioning_steps_job_status_idx" ON "provisioning_steps"("job_id", "status");

-- CreateIndex
CREATE INDEX "provisioning_steps_status_idx" ON "provisioning_steps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_steps_job_id_sequence_key" ON "provisioning_steps"("job_id", "sequence");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_idx" ON "audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_events_user_id_idx" ON "audit_events"("user_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_entity_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events"("occurred_at");

-- CreateIndex
CREATE INDEX "platform_events_status_available_idx" ON "platform_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "platform_events_type_created_idx" ON "platform_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "platform_events_tenant_id_idx" ON "platform_events"("tenant_id");

-- CreateIndex
CREATE INDEX "platform_events_correlation_id_idx" ON "platform_events"("correlation_id");

-- CreateIndex
CREATE INDEX "platform_events_created_at_idx" ON "platform_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_processing_event_id_key" ON "event_processing"("event_id");

-- CreateIndex
CREATE INDEX "event_processing_worker_lease_idx" ON "event_processing"("worker_id", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_definitions_code_key" ON "notification_definitions"("code");

-- CreateIndex
CREATE INDEX "notification_definitions_event_type_idx" ON "notification_definitions"("event_type");

-- CreateIndex
CREATE INDEX "notification_definitions_active_idx" ON "notification_definitions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_dedupe_key_key" ON "usage_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "usage_events_tenant_product_idx" ON "usage_events"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "usage_events_tenant_type_idx" ON "usage_events"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "usage_events_type_occurred_idx" ON "usage_events"("event_type", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_external_identifiers" ADD CONSTRAINT "tenant_external_identifiers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_external_identifiers" ADD CONSTRAINT "tenant_external_identifiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases" ADD CONSTRAINT "databases_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_schemas" ADD CONSTRAINT "database_schemas_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_schemas" ADD CONSTRAINT "database_schemas_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_tenant_product_id_fkey" FOREIGN KEY ("tenant_product_id") REFERENCES "tenant_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "database_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_resources" ADD CONSTRAINT "tenant_resources_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_jobs" ADD CONSTRAINT "provisioning_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_jobs" ADD CONSTRAINT "provisioning_jobs_tenant_product_id_fkey" FOREIGN KEY ("tenant_product_id") REFERENCES "tenant_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_jobs" ADD CONSTRAINT "provisioning_jobs_tenant_resource_id_fkey" FOREIGN KEY ("tenant_resource_id") REFERENCES "tenant_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_jobs" ADD CONSTRAINT "provisioning_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_steps" ADD CONSTRAINT "provisioning_steps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "provisioning_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_processing" ADD CONSTRAINT "event_processing_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "platform_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "tenant_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
