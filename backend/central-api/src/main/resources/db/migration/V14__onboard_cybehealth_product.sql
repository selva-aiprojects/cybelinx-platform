-- V14: Formal Onboarding of Live Product - CybeHealth & Pharma (Regulated Markets)

-- 1. Register CYBEHEALTH Product
INSERT INTO public.products (id, version, product_code, name, description, base_url, product_category, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000070',
    0,
    'CYBEHEALTH',
    'CybeHealth & Pharma',
    'Clinical EMR, FHIR Interoperability & ABDM Level 2 Certified Healthcare Platform',
    'https://cybelinx.com/products/cybehealth',
    'REGULATED_MARKETS',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'CYBEHEALTH');

-- 2. Register Product Version 1.0.0
INSERT INTO public.product_versions (id, version, product_id, version_name, is_current, published_at, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000071',
    0,
    '00000000-0000-0000-0000-000000000070',
    'v1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.product_versions WHERE id = '00000000-0000-0000-0000-000000000071');

UPDATE public.products SET current_version_id = '00000000-0000-0000-0000-000000000071' WHERE product_code = 'CYBEHEALTH';

-- 3. Register Subscription Plans (CYBEHEALTH_ENTERPRISE & CYBEHEALTH_STARTER)
INSERT INTO public.plans (id, version, product_id, plan_code, name, description, status, trial_days, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000072',
    0,
    '00000000-0000-0000-0000-000000000070',
    'CYBEHEALTH_ENTERPRISE',
    'CybeHealth Enterprise Suite',
    'Full clinical EMR, FHIR R4 API server, ABDM Level 2 sync, and dedicated schema isolation',
    'ACTIVE',
    30,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_code = 'CYBEHEALTH_ENTERPRISE');

-- 4. Register Entitlements
INSERT INTO public.entitlements (id, version, plan_id, entitlement_key, name, value, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000073',
    0,
    '00000000-0000-0000-0000-000000000072',
    'FHIR_R4_API',
    'FHIR R4 Interoperability API',
    'ENABLED',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements WHERE id = '00000000-0000-0000-0000-000000000073');

INSERT INTO public.entitlements (id, version, plan_id, entitlement_key, name, value, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000074',
    0,
    '00000000-0000-0000-0000-000000000072',
    'ABDM_LEVEL2_SYNC',
    'Ayushman Bharat Digital Mission Level 2 Sync',
    'ENABLED',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.entitlements WHERE id = '00000000-0000-0000-0000-000000000074');
