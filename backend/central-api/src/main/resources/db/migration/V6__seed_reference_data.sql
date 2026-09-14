-- =====================================================================
-- Port of the retired TypeScript backend prisma/seed.ts — idempotent
-- development reference data + bootstrap platform admin + demo tenant.
--
-- The Java port upstreams the seed that the NestJS app used to run via
-- Prisma. Without it the platform has no roles/permissions (every
-- permission check 403s), no product catalog, and no dev admin that can
-- sign into the platform.
--
-- Idempotency: every statement is guarded by a natural key so the
-- migration is safe to apply on both a fresh database and one that was
-- already seeded (dev database seeded earlier via the legacy Prisma
-- seed or manual imports). Parent foreign keys are resolved through
-- sub-selects on natural keys, never hard-coded ids.
--
-- Bootstrap identity wired for the DEVELOPMENT provider bundle:
--   IDP_PROVIDER=generic (matches UserMappingService lookup)
--   JWT `sub` = seed-dev-admin-0001  (see scripts/mint-dev-jwt.mjs)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reference data (adds only missing rows).
-- ---------------------------------------------------------------------

INSERT INTO public.regions (id, region_code, name, provider, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000001', 'eu-west-1', 'Europe (Ireland)', 'aws', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.regions WHERE region_code = 'eu-west-1');

INSERT INTO public.regions (id, region_code, name, provider, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000002', 'us-east-1', 'US East (N. Virginia)', 'aws', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.regions WHERE region_code = 'us-east-1');

INSERT INTO public.regions (id, region_code, name, provider, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000003', 'ap-south-1', 'Asia Pacific (Mumbai)', 'aws', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.regions WHERE region_code = 'ap-south-1');

INSERT INTO public.resource_catalog (id, resource_type_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000101', 'POSTGRES_SCHEMA', 'PostgreSQL Schema', 'Schema-per-tenant workspace inside a managed database', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA');

INSERT INTO public.resource_catalog (id, resource_type_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000102', 'POSTGRES_DATABASE', 'PostgreSQL Database', 'Dedicated database for a tenant+product', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_DATABASE');

INSERT INTO public.resource_catalog (id, resource_type_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000103', 'OBJECT_STORAGE', 'Object Storage', 'Tenant-scoped object storage bucket', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.resource_catalog WHERE resource_type_code = 'OBJECT_STORAGE');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000201', 'CYBELINX_PLATFORM_ADMIN', 'Cybelinx Platform Administrator', 'Full control over platform metadata, tenants and provisioning', 'PLATFORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'CYBELINX_PLATFORM_ADMIN');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000202', 'CYBELINX_SUPPORT', 'Cybelinx Support Agent', 'Read access to tenant and usage data for triage', 'PLATFORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'CYBELINX_SUPPORT');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000203', 'CYBELINX_AUDITOR', 'Cybelinx Platform Auditor', 'Read-only access to tenant and audit data', 'PLATFORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'CYBELINX_AUDITOR');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000204', 'TENANT_OWNER', 'Tenant Owner', 'Owns a tenant: full management of its members and products', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'TENANT_OWNER');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000205', 'TENANT_ADMIN', 'Tenant Administrator', 'Manages a tenant''s members and product usage', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'TENANT_ADMIN');

INSERT INTO public.roles (id, code, name, description, scope, is_system, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000206', 'TENANT_USER', 'Tenant User', 'Read access to the tenant''s products', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'TENANT_USER');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000301', 'tenant:read', 'Read tenants', 'List and inspect tenants', 'tenant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'tenant:read');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000302', 'tenant:write', 'Create/update tenants', 'Create, update, suspend or delete tenants', 'tenant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'tenant:write');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000303', 'membership:manage', 'Manage tenant memberships', 'Invite, suspend and remove tenant members', 'membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'membership:manage');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000304', 'role:manage', 'Manage roles and grants', 'Assign roles and permission grants', 'rbac', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'role:manage');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000305', 'product:read', 'Read product registry', 'List and inspect products, plans and entitlements', 'product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'product:read');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000306', 'product:write', 'Manage product registry', 'Create and update products, versions, plans and entitlements', 'product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'product:write');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000307', 'product:provision', 'Provision tenant products', 'Attach products and drive provisioning', 'provisioning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'product:provision');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000308', 'audit:read', 'Read audit log', 'Read platform audit events', 'audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'audit:read');

INSERT INTO public.permissions (id, code, name, description, module, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000309', 'usage:read', 'Read usage/metering data', 'Read tenant usage and metering', 'usage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'usage:read');

-- Role -> permission grants (mirrors prisma seed ROLE_PERMISSIONS plus
-- product:write which the Java ProductConstants require).
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'CYBELINX_PLATFORM_ADMIN'
  AND p.code IN ('tenant:read','tenant:write','membership:manage','role:manage','product:read','product:write','product:provision','audit:read','usage:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'CYBELINX_SUPPORT'
  AND p.code IN ('tenant:read','product:read','usage:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'CYBELINX_AUDITOR'
  AND p.code IN ('tenant:read','audit:read','usage:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'TENANT_OWNER'
  AND p.code IN ('tenant:read','tenant:write','membership:manage','role:manage','product:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'TENANT_ADMIN'
  AND p.code IN ('tenant:read','membership:manage','product:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at)
SELECT ('00000000-0000-0000-0000-' || substr(md5(r.code || ':' || p.code), 1, 12))::uuid, r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'TENANT_USER'
  AND p.code IN ('product:read')
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);

INSERT INTO public.notification_definitions (id, code, event_type, name, description, channels, is_active, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000501', 'TENANT_PROVISIONED_NOTIFY', 'TENANT_PROVISIONED', 'Tenant provisioned', 'Fired when a tenant+product has been provisioned', '["email","webhook"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.notification_definitions WHERE code = 'TENANT_PROVISIONED_NOTIFY');

INSERT INTO public.notification_definitions (id, code, event_type, name, description, channels, is_active, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000502', 'PROVISIONING_FAILED_NOTIFY', 'PROVISIONING_FAILED', 'Provisioning failed', 'Fired when a provisioning job fails', '["email"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.notification_definitions WHERE code = 'PROVISIONING_FAILED_NOTIFY');

-- ---------------------------------------------------------------------
-- 2. Product catalog: products, current versions, plans, entitlements.
-- ---------------------------------------------------------------------

INSERT INTO public.products (id, product_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000601', 'JIOPLIX', 'Jioplix', 'Outpatient clinic management product', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'JIOPLIX');

INSERT INTO public.products (id, product_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000602', 'JIOPLIX_SMART', 'Jioplix Smart', 'Diagnostics / smart lab product', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'JIOPLIX_SMART');

INSERT INTO public.products (id, product_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000603', 'LIMS', 'LIMS', 'Laboratory information management system', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'LIMS');

INSERT INTO public.products (id, product_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000604', 'STOREAI', 'StoreAI', 'Pharmacy / retail store management', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'STOREAI');

INSERT INTO public.products (id, product_code, name, description, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000605', 'SYNTHALYST_HRM', 'SynthalystHRM', 'Human resource management for the group', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'SYNTHALYST_HRM');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000701', (SELECT id FROM public.products WHERE product_code = 'JIOPLIX'), '1.0.0', 'Initial platform-registered version', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions v JOIN public.products pr ON pr.id = v.product_id WHERE pr.product_code = 'JIOPLIX' AND v.version = '1.0.0');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000702', (SELECT id FROM public.products WHERE product_code = 'JIOPLIX_SMART'), '1.0.0', 'Initial platform-registered version', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions v JOIN public.products pr ON pr.id = v.product_id WHERE pr.product_code = 'JIOPLIX_SMART' AND v.version = '1.0.0');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000703', (SELECT id FROM public.products WHERE product_code = 'LIMS'), '1.0.0', 'Initial platform-registered version', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions v JOIN public.products pr ON pr.id = v.product_id WHERE pr.product_code = 'LIMS' AND v.version = '1.0.0');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000704', (SELECT id FROM public.products WHERE product_code = 'STOREAI'), '1.0.0', 'Initial platform-registered version', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions v JOIN public.products pr ON pr.id = v.product_id WHERE pr.product_code = 'STOREAI' AND v.version = '1.0.0');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000705', (SELECT id FROM public.products WHERE product_code = 'SYNTHALYST_HRM'), '1.0.0', 'Initial platform-registered version', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions v JOIN public.products pr ON pr.id = v.product_id WHERE pr.product_code = 'SYNTHALYST_HRM' AND v.version = '1.0.0');

UPDATE public.products p SET current_version_id = v.id, updated_at = CURRENT_TIMESTAMP
FROM public.product_versions v
WHERE v.product_id = p.id AND v.is_current AND p.current_version_id IS NULL;

INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000801', (SELECT id FROM public.products WHERE product_code = 'JIOPLIX'), 'JIOPLIX_ENTERPRISE', 'Jioplix Enterprise', 'Full outpatient clinic management', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans pl JOIN public.products pr ON pr.id = pl.product_id WHERE pr.product_code = 'JIOPLIX' AND pl.plan_code = 'JIOPLIX_ENTERPRISE');

INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000802', (SELECT id FROM public.products WHERE product_code = 'JIOPLIX_SMART'), 'JIOPLIX_SMART_PRO', 'Jioplix Smart Professional', 'Diagnostics and smart-lab workflows', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans pl JOIN public.products pr ON pr.id = pl.product_id WHERE pr.product_code = 'JIOPLIX_SMART' AND pl.plan_code = 'JIOPLIX_SMART_PRO');

INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000803', (SELECT id FROM public.products WHERE product_code = 'LIMS'), 'LIMS_STANDARD', 'LIMS Standard', 'Laboratory information management', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans pl JOIN public.products pr ON pr.id = pl.product_id WHERE pr.product_code = 'LIMS' AND pl.plan_code = 'LIMS_STANDARD');

INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000804', (SELECT id FROM public.products WHERE product_code = 'STOREAI'), 'STOREAI_PRO', 'StoreAI Professional', 'Pharmacy and retail store management', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans pl JOIN public.products pr ON pr.id = pl.product_id WHERE pr.product_code = 'STOREAI' AND pl.plan_code = 'STOREAI_PRO');

INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000805', (SELECT id FROM public.products WHERE product_code = 'SYNTHALYST_HRM'), 'SYNTHALYST_HRM_STANDARD', 'SynthalystHRM Standard', 'Group HR management', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans pl JOIN public.products pr ON pr.id = pl.product_id WHERE pr.product_code = 'SYNTHALYST_HRM' AND pl.plan_code = 'SYNTHALYST_HRM_STANDARD');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000901', (SELECT id FROM public.plans WHERE plan_code = 'JIOPLIX_ENTERPRISE'), 'max_seats', 'Maximum seats', '{"max_seats":250}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'JIOPLIX_ENTERPRISE' AND e.key = 'max_seats');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000902', (SELECT id FROM public.plans WHERE plan_code = 'JIOPLIX_ENTERPRISE'), 'isolation_mode', 'Default isolation mode', '{"isolation_mode":"SCHEMA_PER_TENANT"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'JIOPLIX_ENTERPRISE' AND e.key = 'isolation_mode');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000903', (SELECT id FROM public.plans WHERE plan_code = 'JIOPLIX_ENTERPRISE'), 'support_level', 'Support level', '{"support_level":"priority"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'JIOPLIX_ENTERPRISE' AND e.key = 'support_level');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000904', (SELECT id FROM public.plans WHERE plan_code = 'JIOPLIX_SMART_PRO'), 'max_seats', 'Maximum seats', '{"max_seats":100}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'JIOPLIX_SMART_PRO' AND e.key = 'max_seats');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000905', (SELECT id FROM public.plans WHERE plan_code = 'JIOPLIX_SMART_PRO'), 'isolation_mode', 'Default isolation mode', '{"isolation_mode":"SCHEMA_PER_TENANT"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'JIOPLIX_SMART_PRO' AND e.key = 'isolation_mode');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000906', (SELECT id FROM public.plans WHERE plan_code = 'LIMS_STANDARD'), 'max_seats', 'Maximum seats', '{"max_seats":50}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'LIMS_STANDARD' AND e.key = 'max_seats');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000907', (SELECT id FROM public.plans WHERE plan_code = 'LIMS_STANDARD'), 'isolation_mode', 'Default isolation mode', '{"isolation_mode":"SHARED_POOL"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'LIMS_STANDARD' AND e.key = 'isolation_mode');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000908', (SELECT id FROM public.plans WHERE plan_code = 'STOREAI_PRO'), 'max_stores', 'Maximum stores', '{"max_stores":10}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'STOREAI_PRO' AND e.key = 'max_stores');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000909', (SELECT id FROM public.plans WHERE plan_code = 'STOREAI_PRO'), 'isolation_mode', 'Default isolation mode', '{"isolation_mode":"SHARED_POOL"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'STOREAI_PRO' AND e.key = 'isolation_mode');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000910', (SELECT id FROM public.plans WHERE plan_code = 'SYNTHALYST_HRM_STANDARD'), 'max_employees', 'Maximum employees', '{"max_employees":500}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'SYNTHALYST_HRM_STANDARD' AND e.key = 'max_employees');

INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000911', (SELECT id FROM public.plans WHERE plan_code = 'SYNTHALYST_HRM_STANDARD'), 'isolation_mode', 'Default isolation mode', '{"isolation_mode":"SHARED_POOL"}'::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e JOIN public.plans pl ON pl.id = e.plan_id WHERE pl.plan_code = 'SYNTHALYST_HRM_STANDARD' AND e.key = 'isolation_mode');

-- ---------------------------------------------------------------------
-- 3. Demo tenant (ACME) holding the bootstrap platform admin.
-- ---------------------------------------------------------------------

INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b01', 'ACME', 'Acme Medical Diagnostics', 'ACTIVE', (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'IN', 'Asia/Kolkata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = 'ACME');

INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a01', 'dev.admin@cybelinx.test', 'Cybelinx Dev Admin', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'dev.admin@cybelinx.test');

INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a02', (SELECT id FROM public.users WHERE email = 'dev.admin@cybelinx.test'), 'generic', 'seed-dev-admin-0001', 'dev.admin@cybelinx.test', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'generic' AND external_subject = 'seed-dev-admin-0001');

INSERT INTO public.tenant_memberships (id, tenant_id, user_id, status, invited_by_id, invited_at, joined_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b02', t.id, u.id, 'ACTIVE', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.users u
WHERE t.tenant_code = 'ACME' AND u.email = 'dev.admin@cybelinx.test'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = t.id AND m.user_id = u.id);

INSERT INTO public.membership_roles (id, membership_id, role_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000b03', m.id, r.id, CURRENT_TIMESTAMP
FROM public.tenant_memberships m
JOIN public.users u ON u.id = m.user_id
JOIN public.tenants t ON t.id = m.tenant_id
JOIN public.roles r ON r.code = 'CYBELINX_PLATFORM_ADMIN'
WHERE t.tenant_code = 'ACME' AND u.email = 'dev.admin@cybelinx.test'
  AND NOT EXISTS (SELECT 1 FROM public.membership_roles x WHERE x.membership_id = m.id AND x.role_id = r.id);

INSERT INTO public.membership_roles (id, membership_id, role_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000b04', m.id, r.id, CURRENT_TIMESTAMP
FROM public.tenant_memberships m
JOIN public.users u ON u.id = m.user_id
JOIN public.tenants t ON t.id = m.tenant_id
JOIN public.roles r ON r.code = 'TENANT_ADMIN'
WHERE t.tenant_code = 'ACME' AND u.email = 'dev.admin@cybelinx.test'
  AND NOT EXISTS (SELECT 1 FROM public.membership_roles x WHERE x.membership_id = m.id AND x.role_id = r.id);

-- ---------------------------------------------------------------------
-- 4. Demo provisioning trail for ACME + JIOPLIX.
-- ---------------------------------------------------------------------

INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000c01', t.id, pr.id, pl.id, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.products pr, public.plans pl
WHERE t.tenant_code = 'ACME' AND pr.product_code = 'JIOPLIX' AND pl.plan_code = 'JIOPLIX_ENTERPRISE'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_products x WHERE x.tenant_id = t.id AND x.product_id = pr.id);

INSERT INTO public.tenant_external_identifiers (id, tenant_id, product_id, provider, external_id, created_at)
SELECT '00000000-0000-0000-0000-000000000c02', t.id, pr.id, 'JIOPLIX_NEXUS', 'acme-jioplix-0001', CURRENT_TIMESTAMP
FROM public.tenants t, public.products pr
WHERE t.tenant_code = 'ACME' AND pr.product_code = 'JIOPLIX'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_external_identifiers x WHERE x.tenant_id = t.id AND x.product_id = pr.id AND x.provider = 'JIOPLIX_NEXUS');

INSERT INTO public.databases (id, name, provider, endpoint, port, region_id, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000d01', 'cybelinx_shared_pool_eu_west_1', 'postgres', 'localhost', 5432, (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.databases WHERE name = 'cybelinx_shared_pool_eu_west_1');

INSERT INTO public.database_schemas (id, database_id, region_id, schema_name, environment, status, migration_version, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000d02', (SELECT id FROM public.databases WHERE name = 'cybelinx_shared_pool_eu_west_1'), (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'acme_jioplix', 'DEVELOPMENT', 'ACTIVE', '1.0.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.database_schemas WHERE schema_name = 'acme_jioplix');

INSERT INTO public.tenant_resources (id, tenant_id, product_id, resource_id, isolation_mode, database_id, schema_id, schema_name, region_id, environment, status, provisioning_state, migration_version, credential_reference, tenant_product_id, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000e01', t.id, pr.id, rc.id, 'SCHEMA_PER_TENANT', db.id, ds.id, 'acme_jioplix', r.id, 'DEVELOPMENT', 'ACTIVE', 'SUCCEEDED', '1.0.0', 'vault://dev/tenants/acme/products/jioplix/development/app', tp.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t
JOIN public.products pr ON pr.product_code = 'JIOPLIX'
JOIN public.resource_catalog rc ON rc.resource_type_code = 'POSTGRES_SCHEMA'
JOIN public.databases db ON db.name = 'cybelinx_shared_pool_eu_west_1'
JOIN public.database_schemas ds ON ds.schema_name = 'acme_jioplix'
JOIN public.regions r ON r.region_code = 'eu-west-1'
JOIN public.tenant_products tp ON tp.tenant_id = t.id AND tp.product_id = pr.id
WHERE t.tenant_code = 'ACME'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_resources x WHERE x.tenant_id = t.id AND x.product_id = pr.id AND x.resource_id = rc.id AND x.environment = 'DEVELOPMENT');

INSERT INTO public.provisioning_jobs (id, tenant_id, tenant_product_id, tenant_resource_id, operation, state, progress, requested_by_id, queued_at, started_at, finished_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000f01', t.id, tp.id, tr.id, 'PROVISION', 'SUCCEEDED', 100, u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t
JOIN public.tenant_products tp ON tp.tenant_id = t.id
JOIN public.tenant_resources tr ON tr.tenant_id = t.id AND tr.tenant_product_id = tp.id
JOIN public.users u ON u.email = 'dev.admin@cybelinx.test'
WHERE t.tenant_code = 'ACME' AND tp.status = 'ACTIVE' AND tr.provisioning_state = 'SUCCEEDED'
  AND NOT EXISTS (SELECT 1 FROM public.provisioning_jobs x WHERE x.tenant_id = t.id AND x.tenant_product_id = tp.id AND x.operation = 'PROVISION');

INSERT INTO public.provisioning_steps (id, job_id, sequence, name, status, started_at, finished_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000f02', j.id, 1, 'create_schema', 'SUCCEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.provisioning_jobs j
WHERE j.operation = 'PROVISION'
  AND NOT EXISTS (SELECT 1 FROM public.provisioning_steps x WHERE x.job_id = j.id AND x.sequence = 1);

INSERT INTO public.provisioning_steps (id, job_id, sequence, name, status, started_at, finished_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000f03', j.id, 2, 'grant_privileges', 'SUCCEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.provisioning_jobs j
WHERE j.operation = 'PROVISION'
  AND NOT EXISTS (SELECT 1 FROM public.provisioning_steps x WHERE x.job_id = j.id AND x.sequence = 2);

INSERT INTO public.provisioning_steps (id, job_id, sequence, name, status, started_at, finished_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000f04', j.id, 3, 'record_migration_version', 'SUCCEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.provisioning_jobs j
WHERE j.operation = 'PROVISION'
  AND NOT EXISTS (SELECT 1 FROM public.provisioning_steps x WHERE x.job_id = j.id AND x.sequence = 3);

INSERT INTO public.audit_events (id, tenant_id, user_id, product_id, actor_type, action, entity_type, entity_id, metadata, occurred_at)
SELECT '00000000-0000-0000-0000-000000000d03', t.id, u.id, pr.id, 'USER', 'tenant.resource.provisioned', 'tenant_resource', tr.id, '{"isolationMode":"SCHEMA_PER_TENANT","environment":"DEVELOPMENT"}'::jsonb, CURRENT_TIMESTAMP
FROM public.tenants t
JOIN public.products pr ON pr.product_code = 'JIOPLIX'
JOIN public.users u ON u.email = 'dev.admin@cybelinx.test'
JOIN public.tenant_resources tr ON tr.tenant_id = t.id
WHERE t.tenant_code = 'ACME'
  AND NOT EXISTS (SELECT 1 FROM public.audit_events x WHERE x.tenant_id = t.id AND x.action = 'tenant.resource.provisioned' AND x.entity_id = tr.id);