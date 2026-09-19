-- =============================================================================
-- V25: Reset all tenants and seed Jioplix hospital demo tenants
-- Removes all existing tenant data (test/legacy entries), then provisions
-- 5 real Jioplix hospital tenants — one per subscription plan tier.
--
-- Enum values (verified):
--   isolationmode      : SHARED_POOL | SCHEMA_PER_TENANT | DEDICATED_DATABASE | DEDICATED_INFRASTRUCTURE
--   provisioningstate  : PENDING | IN_PROGRESS | SUCCEEDED | FAILED | CANCELLED | ROLLED_BACK
--   environment        : DEVELOPMENT | STAGING | PRODUCTION
--   tenantproductstatus: PROVISIONING | ACTIVE | SUSPENDED | LAPSED | DISABLED
--   tenantstatus       : PROVISIONING | ACTIVE | SUSPENDED | DEACTIVATED | DELETION_PENDING | DELETED
--
-- Key IDs (from existing seed data):
--   JIOPLIX product    : 93da3427-a915-4ff2-890d-862888bc86c2
--   BASIC plan         : 00000000-0000-0000-0000-000000000811
--   STANDARD plan      : 00000000-0000-0000-0000-000000000812
--   PROFESSIONAL plan  : 00000000-0000-0000-0000-000000000813
--   ENTERPRISE plan    : f99a238a-9020-4760-b14c-f5e0889f4e23
--   JIOPLIX_ENTERPRISE : 00000000-0000-0000-0000-000000000801
--   Region ap-south-1  : 6ca437e5-0e82-4284-97a4-11d46e2120fa
--   POSTGRES_SCHEMA    : d414ada7-5800-40aa-b17c-a7cb16c09e37
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. CLEANUP: Remove all existing tenant-linked rows
-- ──────────────────────────────────────────────────────────────────────────────
DELETE FROM public.audit_events               WHERE tenant_id IS NOT NULL;
DELETE FROM public.usage_events               WHERE tenant_id IS NOT NULL;
DELETE FROM public.provisioning_steps
    WHERE job_id IN (SELECT id FROM public.provisioning_jobs WHERE tenant_id IS NOT NULL);
DELETE FROM public.provisioning_jobs          WHERE tenant_id IS NOT NULL;
DELETE FROM public.tenant_external_identifiers;
DELETE FROM public.tenant_memberships;
DELETE FROM public.tenant_resources;
DELETE FROM public.tenant_products;
DELETE FROM public.tenants;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. SEED TENANTS
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── Tenant 1: Apollo Multispecialty Clinic — BASIC plan ─────────────────────
INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
VALUES (
    '11000000-0000-0000-0000-000000000001',
    'JIOPLIX_APOLLO',
    'Apollo Multispecialty Clinic',
    'ACTIVE',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
VALUES (
    '12000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    '00000000-0000-0000-0000-000000000811',
    'ACTIVE', NOW(), NOW(), NOW(), 1,
    'https://apollo.jioplix.com'
);
INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
VALUES (
    '13000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'd414ada7-5800-40aa-b17c-a7cb16c09e37',
    'SCHEMA_PER_TENANT',
    'jioplix_apollo',
    '6ca437e5-0e82-4284-97a4-11d46e2120fa',
    'PRODUCTION',
    'ACTIVE', 'SUCCEEDED', 1,
    '12000000-0000-0000-0000-000000000001',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
VALUES (
    '14000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'JIOPLIX_NEXUS', 'HOSP_APOLLO_01', NOW()
);

-- ─── Tenant 2: Fortis Healthcare — STANDARD plan (Pharmacy & Lab) ─────────────
INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
VALUES (
    '11000000-0000-0000-0000-000000000002',
    'JIOPLIX_FORTIS',
    'Fortis Healthcare',
    'ACTIVE',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
VALUES (
    '12000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    '00000000-0000-0000-0000-000000000812',
    'ACTIVE', NOW(), NOW(), NOW(), 1,
    'https://fortis.jioplix.com'
);
INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
VALUES (
    '13000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'd414ada7-5800-40aa-b17c-a7cb16c09e37',
    'SCHEMA_PER_TENANT',
    'jioplix_fortis',
    '6ca437e5-0e82-4284-97a4-11d46e2120fa',
    'PRODUCTION',
    'ACTIVE', 'SUCCEEDED', 1,
    '12000000-0000-0000-0000-000000000002',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
VALUES (
    '14000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'JIOPLIX_NEXUS', 'HOSP_FORTIS_02', NOW()
);

-- ─── Tenant 3: Manipal Hospitals — PROFESSIONAL plan (Inpatient IPD) ──────────
INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
VALUES (
    '11000000-0000-0000-0000-000000000003',
    'JIOPLIX_MANIPAL',
    'Manipal Hospitals',
    'ACTIVE',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
VALUES (
    '12000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000003',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    '00000000-0000-0000-0000-000000000813',
    'ACTIVE', NOW(), NOW(), NOW(), 1,
    'https://manipal.jioplix.com'
);
INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
VALUES (
    '13000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000003',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'd414ada7-5800-40aa-b17c-a7cb16c09e37',
    'SCHEMA_PER_TENANT',
    'jioplix_manipal',
    '6ca437e5-0e82-4284-97a4-11d46e2120fa',
    'PRODUCTION',
    'ACTIVE', 'SUCCEEDED', 1,
    '12000000-0000-0000-0000-000000000003',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
VALUES (
    '14000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000003',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'JIOPLIX_NEXUS', 'HOSP_MANIPAL_03', NOW()
);

-- ─── Tenant 4: AIIMS New Delhi — ENTERPRISE plan (Digital Health + ABDM) ──────
INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
VALUES (
    '11000000-0000-0000-0000-000000000004',
    'JIOPLIX_AIIMS',
    'AIIMS New Delhi',
    'ACTIVE',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
VALUES (
    '12000000-0000-0000-0000-000000000004',
    '11000000-0000-0000-0000-000000000004',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'f99a238a-9020-4760-b14c-f5e0889f4e23',
    'ACTIVE', NOW(), NOW(), NOW(), 1,
    'https://aiims.jioplix.com'
);
INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
VALUES (
    '13000000-0000-0000-0000-000000000004',
    '11000000-0000-0000-0000-000000000004',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'd414ada7-5800-40aa-b17c-a7cb16c09e37',
    'SCHEMA_PER_TENANT',
    'jioplix_aiims',
    '6ca437e5-0e82-4284-97a4-11d46e2120fa',
    'PRODUCTION',
    'ACTIVE', 'SUCCEEDED', 1,
    '12000000-0000-0000-0000-000000000004',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
VALUES (
    '14000000-0000-0000-0000-000000000004',
    '11000000-0000-0000-0000-000000000004',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'JIOPLIX_NEXUS', 'HOSP_AIIMS_DELHI_04', NOW()
);

-- ─── Tenant 5: Narayana Health — JIOPLIX_ENTERPRISE plan (Multi-facility) ─────
INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
VALUES (
    '11000000-0000-0000-0000-000000000005',
    'JIOPLIX_NARAYANA',
    'Narayana Health',
    'ACTIVE',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
VALUES (
    '12000000-0000-0000-0000-000000000005',
    '11000000-0000-0000-0000-000000000005',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    '00000000-0000-0000-0000-000000000801',
    'ACTIVE', NOW(), NOW(), NOW(), 1,
    'https://narayana.jioplix.com'
);
INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
VALUES (
    '13000000-0000-0000-0000-000000000005',
    '11000000-0000-0000-0000-000000000005',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'd414ada7-5800-40aa-b17c-a7cb16c09e37',
    'SCHEMA_PER_TENANT',
    'jioplix_narayana',
    '6ca437e5-0e82-4284-97a4-11d46e2120fa',
    'PRODUCTION',
    'ACTIVE', 'SUCCEEDED', 1,
    '12000000-0000-0000-0000-000000000005',
    NOW(), NOW(), 1
);
INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
VALUES (
    '14000000-0000-0000-0000-000000000005',
    '11000000-0000-0000-0000-000000000005',
    '93da3427-a915-4ff2-890d-862888bc86c2',
    'JIOPLIX_NEXUS', 'HOSP_NARAYANA_05', NOW()
);
