-- =====================================================================
-- V16: Seed StoreAI Demo Users, Supabase Auth Identity Mapping,
-- and Segregate DEMO / PRODUCTION Database Resources
-- =====================================================================

-- 1. Create StoreAI Canonical Demo Users
INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a10', 'storeai.admin@cybelinx.com', 'StoreAI Platform Administrator', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'storeai.admin@cybelinx.com');

INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a11', 'demo.nike@cybelinx.com', 'Nike Store Merchant Admin', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'demo.nike@cybelinx.com');

INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a12', 'demo.adidas@cybelinx.com', 'Adidas Store Merchant Admin', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'demo.adidas@cybelinx.com');

INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a13', 'demo.puma@cybelinx.com', 'Puma Store Merchant Admin', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'demo.puma@cybelinx.com');


-- 2. Link Identity Provider Mappings for Supabase Auth and Generic JWT
INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b10', (SELECT id FROM public.users WHERE email = 'storeai.admin@cybelinx.com'), 'supabase', 'sub-storeai-admin', 'storeai.admin@cybelinx.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'supabase' AND email = 'storeai.admin@cybelinx.com');

INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b11', (SELECT id FROM public.users WHERE email = 'demo.nike@cybelinx.com'), 'supabase', 'sub-demo-nike', 'demo.nike@cybelinx.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'supabase' AND email = 'demo.nike@cybelinx.com');

INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b12', (SELECT id FROM public.users WHERE email = 'demo.adidas@cybelinx.com'), 'supabase', 'sub-demo-adidas', 'demo.adidas@cybelinx.com', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'supabase' AND email = 'demo.adidas@cybelinx.com');


-- 3. Register Merchant Store Tenants if Not Present
INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000c11', 'STOREAI_NIKE_01', 'Nike Flagship Store', 'ACTIVE', (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'IE', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = 'STOREAI_NIKE_01');

INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000c12', 'STOREAI_ADIDAS_01', 'Adidas Sportswear Store', 'ACTIVE', (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'IE', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = 'STOREAI_ADIDAS_01');

INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000c13', 'STORE_PUMA_01', 'Puma Retail Store', 'ACTIVE', (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'IE', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = 'STORE_PUMA_01');


-- 4. Assign Tenant Admin Role Memberships for Merchant Tenants
INSERT INTO public.tenant_memberships (id, tenant_id, user_id, status, invited_by_id, invited_at, joined_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000e11', t.id, u.id, 'ACTIVE', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.users u
WHERE t.tenant_code = 'STOREAI_NIKE_01' AND u.email = 'demo.nike@cybelinx.com'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = t.id AND m.user_id = u.id);

INSERT INTO public.tenant_memberships (id, tenant_id, user_id, status, invited_by_id, invited_at, joined_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000e12', t.id, u.id, 'ACTIVE', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.users u
WHERE t.tenant_code = 'STOREAI_ADIDAS_01' AND u.email = 'demo.adidas@cybelinx.com'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = t.id AND m.user_id = u.id);

-- Assign Role TENANT_ADMIN
INSERT INTO public.membership_roles (id, membership_id, role_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(m.id::text || ':TENANT_ADMIN'), 1, 12))::uuid, m.id, r.id, CURRENT_TIMESTAMP
FROM public.tenant_memberships m
JOIN public.users u ON u.id = m.user_id
JOIN public.roles r ON r.code = 'TENANT_ADMIN'
WHERE u.email IN ('demo.nike@cybelinx.com', 'demo.adidas@cybelinx.com')
  AND NOT EXISTS (SELECT 1 FROM public.membership_roles x WHERE x.membership_id = m.id AND x.role_id = r.id);



-- 5. Segregate Database Resources into DEMO and PRODUCTION Environments
-- DEMO Database Schemas
INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000f11',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_NIKE_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'DEVELOPMENT',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_demo_storeai_nike_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources 
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_NIKE_01')
      AND environment = 'DEVELOPMENT'
);

INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000f12',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_ADIDAS_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'DEVELOPMENT',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_demo_storeai_adidas_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources 
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_ADIDAS_01')
      AND environment = 'DEVELOPMENT'
);

-- PRODUCTION Database Schemas
INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000f21',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_NIKE_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'PRODUCTION',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_prod_storeai_nike_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources 
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_NIKE_01')
      AND environment = 'PRODUCTION'
);

INSERT INTO public.tenant_resources (id, version, tenant_id, product_id, resource_id, isolation_mode, environment, status, provisioning_state, schema_name, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000f22',
    0,
    (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_ADIDAS_01'),
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    (SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA'),
    'SCHEMA_PER_TENANT',
    'PRODUCTION',
    'ACTIVE',
    'SUCCEEDED',
    'tenant_prod_storeai_adidas_db',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_resources 
    WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_code = 'STOREAI_ADIDAS_01')
      AND environment = 'PRODUCTION'
);
