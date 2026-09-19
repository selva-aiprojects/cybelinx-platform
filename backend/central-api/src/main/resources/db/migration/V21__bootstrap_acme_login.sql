-- ---------------------------------------------------------------------
-- V21 — Deterministic bootstrap for the Cybelinx admin portal login.
--
-- Restores the ACME demo tenant + dev-admin ACME membership +
-- CYBELINX_PLATFORM_ADMIN grant that the operational cleanup removed
-- (every statement guarded on natural keys, fixed UUIDs, idempotent —
-- runnable repeatedly with no duplicates), and adds the users.password_hash
-- column used by the new email+password login.
--
-- NOTE on password hashing: we deliberately do NOT embed a bcrypt literal
-- here. The backend login endpoint seeds the documented default password
-- (Admin@123) on the dev admin's FIRST successful sign-in by hashing with
-- the running BCryptPasswordEncoder and persisting it when password_hash
-- is NULL; every subsequent login requires bcrypt-match. This keeps the
-- migration transcription-safe and the stored value a real hash, never
-- plaintext.
-- ---------------------------------------------------------------------

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_hash varchar(255);

-- ACME tenant (deterministic canonical UUID 0b01, guard on tenant_code).
INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b01', 'ACME', 'Acme Medical Diagnostics', 'ACTIVE',
       (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'), 'IN', 'Asia/Kolkata',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = 'ACME');

-- dev-admin ACME membership (deterministic canonical UUID 0b02, guarded
-- on (ACME, dev.admin@cybelinx.test)).
INSERT INTO public.tenant_memberships (id, tenant_id, user_id, status, invited_by_id, invited_at, joined_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000b02', t.id, u.id, 'ACTIVE', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.tenants t, public.users u
WHERE t.tenant_code = 'ACME' AND u.email = 'dev.admin@cybelinx.test'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = t.id AND m.user_id = u.id);

-- Platform-admin grant on that membership (deterministic canonical UUID
-- 0b03, guarded on (ACME, dev.admin@cybelinx.test, CYBELINX_PLATFORM_ADMIN)).
INSERT INTO public.membership_roles (id, membership_id, role_id, granted_at)
SELECT '00000000-0000-0000-0000-000000000b03', m.id, r.id, CURRENT_TIMESTAMP
FROM public.tenant_memberships m
JOIN public.tenants t ON t.id = m.tenant_id
JOIN public.users u ON u.id = m.user_id
JOIN public.roles r ON r.code = 'CYBELINX_PLATFORM_ADMIN'
WHERE t.tenant_code = 'ACME' AND u.email = 'dev.admin@cybelinx.test'
  AND NOT EXISTS (SELECT 1 FROM public.membership_roles x WHERE x.membership_id = m.id AND x.role_id = r.id);
