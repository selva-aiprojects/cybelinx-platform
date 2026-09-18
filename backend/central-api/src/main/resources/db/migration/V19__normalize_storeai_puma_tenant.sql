-- =====================================================================
-- V19: Normalize StoreAI Puma tenant code and restore parity with
-- Nike / Adidas demo merchants (identity mapping, membership, role,
-- DEMO and PRODUCTION database resources).
-- =====================================================================

-- 1. Rename tenant code to match the STOREAI_* convention.
UPDATE public.tenants
SET tenant_code = 'STOREAI_PUMA_01', updated_at = CURRENT_TIMESTAMP
WHERE tenant_code = 'STORE_PUMA_01';

-- 2. Link Supabase identity mapping for the Puma merchant admin
--    (V16 only linked storeai.admin, demo.nike, demo.adidas).
INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b13', u.id, 'supabase', 'sub-demo-puma', u.email, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.users u
WHERE u.email = 'demo.puma@cybelinx.com'
  AND NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'supabase' AND email = 'demo.puma@cybelinx.com');

-- 3. Assign Tenant Admin membership for the Puma merchant tenant.
INSERT INTO public.tenant_memberships (id, tenant_id, user_id, status, invited_by_id, invited_at, joined_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000e13', t.id, u.id, 'ACTIVE', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.users u
WHERE t.tenant_code = 'STOREAI_PUMA_01' AND u.email = 'demo.puma@cybelinx.com'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = t.id AND m.user_id = u.id);

INSERT INTO public.membership_roles (id, membership_id, role_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(m.id::text || ':TENANT_ADMIN'), 1, 12))::uuid, m.id, r.id, CURRENT_TIMESTAMP
FROM public.tenant_memberships m
JOIN public.users u ON u.id = m.user_id
JOIN public.roles r ON r.code = 'TENANT_ADMIN'
WHERE u.email = 'demo.puma@cybelinx.com'
  AND NOT EXISTS (SELECT 1 FROM public.membership_roles x WHERE x.membership_id = m.id AND x.role_id = r.id);

-- 4. Segregate Puma schema resources into DEMO and PRODUCTION environments.
INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000f13',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_PUMA_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'DEVELOPMENT',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_demo_storeai_puma_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_PUMA_01')
      AND environment = 'DEVELOPMENT'
);

INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000f23',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_PUMA_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'PRODUCTION',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_prod_storeai_puma_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_PUMA_01')
      AND environment = 'PRODUCTION'
);