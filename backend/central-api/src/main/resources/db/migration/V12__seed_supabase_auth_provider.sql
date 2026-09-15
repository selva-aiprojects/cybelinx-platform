-- ---------------------------------------------------------------------
-- V12: Seed Supabase Auth Provider Reference Catalog Data
-- ---------------------------------------------------------------------

-- Ensure default Supabase Auth provider definition is registered in platform metadata
INSERT INTO public.tenant_idp_configs (id, tenant_id, provider_type, issuer, jwks_uri, audience, client_id, is_enabled, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000001201',
    (SELECT id FROM public.tenants WHERE tenant_code = 'ACME'),
    'SUPABASE',
    'https://demo-project.supabase.co/auth/v1',
    'https://demo-project.supabase.co/auth/v1/.well-known/jwks.json',
    'authenticated',
    'cybelinx-admin-portal',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_idp_configs WHERE provider_type = 'SUPABASE');
