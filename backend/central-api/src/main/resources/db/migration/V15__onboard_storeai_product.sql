-- V15: Formal Onboarding of StoreAI Composable Commerce Product & Portfolio

-- 1. Register or Update STOREAI Product
INSERT INTO public.products (id, version, product_code, portfolio_code, name, description, base_url, product_category, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000080',
    0,
    'STOREAI',
    'CYBECOMMERCE',
    'StoreAI Composable Commerce',
    'AI-Powered Composable Retail Commerce, Omni-Channel Store Ops & Catalog Engine',
    'https://cybelinx.com/products/cybecommerce',
    'ENTERPRISE_OPERATIONS',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'STOREAI');

UPDATE public.products 
SET portfolio_code = 'CYBECOMMERCE', 
    name = 'StoreAI Composable Commerce', 
    description = 'AI-Powered Composable Retail Commerce, Omni-Channel Store Ops & Catalog Engine', 
    base_url = 'https://cybelinx.com/products/cybecommerce', 
    product_category = 'ENTERPRISE_OPERATIONS' 
WHERE product_code = 'STOREAI';

-- 2. Register Product Version 1.0.0
INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
SELECT
    '00000000-0000-0000-0000-000000000081',
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    '1.0.0',
    'StoreAI v1.0.0 Composable Commerce Production Release',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.product_versions v 
    JOIN public.products pr ON pr.id = v.product_id 
    WHERE pr.product_code = 'STOREAI' AND v.version = '1.0.0'
);

UPDATE public.products 
SET current_version_id = (
    SELECT v.id FROM public.product_versions v 
    JOIN public.products pr ON pr.id = v.product_id 
    WHERE pr.product_code = 'STOREAI' AND v.version = '1.0.0'
) 
WHERE product_code = 'STOREAI';

-- 3. Register Subscription Plans (STOREAI_ENTERPRISE)
INSERT INTO public.plans (id, version, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000082',
    0,
    (SELECT id FROM public.products WHERE product_code = 'STOREAI'),
    'STOREAI_ENTERPRISE',
    'StoreAI Enterprise Omni-Channel Suite',
    'Full composable retail catalog, multi-store checkout engine, AI recommendations, and dedicated schema isolation',
    'ACTIVE',
    14,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.plans pl 
    JOIN public.products pr ON pr.id = pl.product_id 
    WHERE pr.product_code = 'STOREAI' AND pl.plan_code = 'STOREAI_ENTERPRISE'
);

-- 4. Register Entitlements
INSERT INTO public.entitlements (id, version, plan_id, key, name, value, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000083',
    0,
    (SELECT id FROM public.plans WHERE plan_code = 'STOREAI_ENTERPRISE'),
    'CATALOG_MANAGEMENT',
    'Omni-Channel Catalog Engine',
    '{"enabled": true}'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.entitlements e 
    JOIN public.plans pl ON pl.id = e.plan_id 
    WHERE pl.plan_code = 'STOREAI_ENTERPRISE' AND e.key = 'CATALOG_MANAGEMENT'
);

INSERT INTO public.entitlements (id, version, plan_id, key, name, value, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000084',
    0,
    (SELECT id FROM public.plans WHERE plan_code = 'STOREAI_ENTERPRISE'),
    'AI_RECOMMENDATIONS',
    'AI Personalized Product Recommendations',
    '{"enabled": true}'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM public.entitlements e 
    JOIN public.plans pl ON pl.id = e.plan_id 
    WHERE pl.plan_code = 'STOREAI_ENTERPRISE' AND e.key = 'AI_RECOMMENDATIONS'
);
