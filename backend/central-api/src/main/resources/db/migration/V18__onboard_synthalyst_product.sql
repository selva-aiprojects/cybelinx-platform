-- Register SynthalystHRM as a first-class product before tenants can be onboarded.
INSERT INTO public.products (id, version, product_code, portfolio_code, name, description, base_url, product_category, status, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000090', 0, 'SYNTHALYST', 'SYNTHALYST',
       'SynthalystHRM', 'AI-powered multi-tenant HRMS with Indian statutory compliance.',
       'https://synthalyst.cybelinx.com', 'ENTERPRISE_OPERATIONS', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'SYNTHALYST');

INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT '00000000-0000-0000-0000-000000000091', p.id, '1.0.0',
       'SynthalystHRM initial control-plane onboarding integration.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.products p
WHERE p.product_code = 'SYNTHALYST'
  AND NOT EXISTS (SELECT 1 FROM public.product_versions v WHERE v.product_id = p.id AND v.version = '1.0.0');

UPDATE public.products p
SET current_version_id = v.id
FROM public.product_versions v
WHERE p.product_code = 'SYNTHALYST' AND v.product_id = p.id AND v.version = '1.0.0';

INSERT INTO public.plans (id, version, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000092', 0, p.id, 'SYNTHALYST_ENTERPRISE',
       'SynthalystHRM Enterprise', 'Full HRMS workspace with isolated organization data.', 'ACTIVE', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM public.products p
WHERE p.product_code = 'SYNTHALYST'
  AND NOT EXISTS (SELECT 1 FROM public.plans pl WHERE pl.product_id = p.id AND pl.plan_code = 'SYNTHALYST_ENTERPRISE');
