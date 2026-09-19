-- ---------------------------------------------------------------------
-- V22 — Ensure the dev-admin platform user + identity exist.
--
-- V21 restored the ACME tenant, membership and CYBELINX_PLATFORM_ADMIN
-- grant that an operational cleanup removed, but the email+password login
-- (backend POST /auth/login) also needs the backing user + identity for
-- dev.admin@cybelinx.test. V6 seeds both on a fresh schema; this migration
-- re-creates them where the cleanup wiped them out. Every statement is
-- guarded on natural keys with the same deterministic UUIDs as V6, so it is
-- idempotent and adds nothing on a database that already has the records.
-- ---------------------------------------------------------------------

INSERT INTO public.users (id, email, "displayName", status, locale, timezone, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a01', 'dev.admin@cybelinx.test', 'Cybelinx Dev Admin', 'ACTIVE', 'en', 'UTC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'dev.admin@cybelinx.test');

INSERT INTO public.user_identities (id, user_id, identity_provider, external_subject, email, is_primary, linked_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000a02', (SELECT id FROM public.users WHERE email = 'dev.admin@cybelinx.test'), 'generic', 'seed-dev-admin-0001', 'dev.admin@cybelinx.test', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.user_identities WHERE identity_provider = 'generic' AND external_subject = 'seed-dev-admin-0001');