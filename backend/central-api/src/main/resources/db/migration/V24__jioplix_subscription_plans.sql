-- =====================================================================
-- V24: Jioplix Subscription Plans & Clinical Entitlements
-- Matches official Jioplix (https://jioplix.com) platform tiers:
-- 1. BASIC        - Outpatient (OPD), EMR, Scheduling & Billing
-- 2. STANDARD     - Basic + Pharmacy Inventory & Diagnostics/Lab (LIMS)
-- 3. PROFESSIONAL - Standard + Inpatient (IPD) Bed Map & AI Predictive Analytics
-- 4. ENTERPRISE   - Professional + ABDM Interoperability, Clinical Ops & SLA Help Desk
-- Also retains legacy JIOPLIX_ENTERPRISE plan code for backward compatibility.
-- =====================================================================

DO $$
DECLARE
    v_product_id uuid;
    v_basic_id uuid := '00000000-0000-0000-0000-000000000811'::uuid;
    v_standard_id uuid := '00000000-0000-0000-0000-000000000812'::uuid;
    v_pro_id uuid := '00000000-0000-0000-0000-000000000813'::uuid;
    v_enterprise_id uuid;
    v_legacy_enterprise_id uuid := '00000000-0000-0000-0000-000000000801'::uuid;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE product_code = 'JIOPLIX' LIMIT 1;
    IF v_product_id IS NULL THEN
        v_product_id := '00000000-0000-0000-0000-000000000601'::uuid;
        INSERT INTO public.products (id, product_code, name, description, base_url, status, created_at, updated_at, version)
        VALUES (
            v_product_id,
            'JIOPLIX',
            'Jioplix',
            'Enterprise clinical EHR, inpatient/outpatient hospital operations, and multi-facility healthcare platform',
            'https://jioplix.com',
            'ACTIVE'::public.productstatus,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            0
        )
        ON CONFLICT (product_code) DO UPDATE
        SET base_url = 'https://jioplix.com', status = 'ACTIVE'::public.productstatus, updated_at = CURRENT_TIMESTAMP;
    END IF;

    -- 1. Upsert BASIC plan
    INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
    VALUES (
        v_basic_id,
        v_product_id,
        'BASIC',
        'Jioplix Basic (Clinic & OPD)',
        'Essential outpatient clinic management: patient registration, EMR clinical notes, doctor scheduling, and billing.',
        'ACTIVE'::public.planstatus,
        14,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0
    )
    ON CONFLICT (product_id, plan_code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        trial_days = EXCLUDED.trial_days,
        updated_at = CURRENT_TIMESTAMP;

    -- 2. Upsert STANDARD plan
    INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
    VALUES (
        v_standard_id,
        v_product_id,
        'STANDARD',
        'Jioplix Standard (Pharmacy & Lab)',
        'Comprehensive clinic OS: includes OPD, Pharmacy inventory & expiry tracking, integrated diagnostics & Laboratory (LIMS), and hospital master configuration.',
        'ACTIVE'::public.planstatus,
        14,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0
    )
    ON CONFLICT (product_id, plan_code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        trial_days = EXCLUDED.trial_days,
        updated_at = CURRENT_TIMESTAMP;

    -- 3. Upsert PROFESSIONAL plan
    INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
    VALUES (
        v_pro_id,
        v_product_id,
        'PROFESSIONAL',
        'Jioplix Professional (Inpatient IPD)',
        'Multi-specialty hospital management: includes Standard plus Live Ward Bed Mapping (IPD), Non-Clinical Operations, AI predictive throughput analytics, and clinical reports.',
        'ACTIVE'::public.planstatus,
        30,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0
    )
    ON CONFLICT (product_id, plan_code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        trial_days = EXCLUDED.trial_days,
        updated_at = CURRENT_TIMESTAMP;

    -- 4. Upsert ENTERPRISE plan
    SELECT id INTO v_enterprise_id FROM public.plans WHERE product_id = v_product_id AND plan_code = 'ENTERPRISE';
    IF v_enterprise_id IS NULL THEN
        v_enterprise_id := '00000000-0000-0000-0000-000000000814'::uuid;
        INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
        VALUES (
            v_enterprise_id,
            v_product_id,
            'ENTERPRISE',
            'Jioplix Enterprise (Digital Health & ABDM)',
            'Full hospital operating system: includes Professional plus Clinical Operations, Enterprise SLA Help Desk & Equipment Register, ABDM (M1/M2/M3) FHIR interoperability, and AI Clinical Co-Pilot.',
            'ACTIVE'::public.planstatus,
            30,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            0
        );
    ELSE
        UPDATE public.plans
        SET name = 'Jioplix Enterprise (Digital Health & ABDM)',
            description = 'Full hospital operating system: includes Professional plus Clinical Operations, Enterprise SLA Help Desk & Equipment Register, ABDM (M1/M2/M3) FHIR interoperability, and AI Clinical Co-Pilot.',
            status = 'ACTIVE'::public.planstatus,
            trial_days = 30,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_enterprise_id;
    END IF;

    -- 5. Upsert legacy JIOPLIX_ENTERPRISE plan for backward compatibility
    INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
    VALUES (
        v_legacy_enterprise_id,
        v_product_id,
        'JIOPLIX_ENTERPRISE',
        'Jioplix Enterprise (Digital Health & ABDM)',
        'Full hospital operating system: includes Professional plus Clinical Operations, Enterprise SLA Help Desk & Equipment Register, ABDM (M1/M2/M3) FHIR interoperability, and AI Clinical Co-Pilot.',
        'ACTIVE'::public.planstatus,
        30,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0
    )
    ON CONFLICT (product_id, plan_code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        trial_days = EXCLUDED.trial_days,
        updated_at = CURRENT_TIMESTAMP;

    -- Entitlements for BASIC
    SELECT id INTO v_basic_id FROM public.plans WHERE product_id = v_product_id AND plan_code = 'BASIC';
    INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at, version)
    VALUES
        (gen_random_uuid(), v_basic_id, 'max_doctors', 'Maximum Doctor Seats', '{"limit": 5}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_basic_id, 'modules', 'Enabled Clinical Modules', '{"modules": ["OPD", "PATIENTS", "BILLING"]}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_basic_id, 'ipd_enabled', 'Inpatient (IPD) Bed Map', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_basic_id, 'pharmacy_enabled', 'Pharmacy Inventory & Expiries', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_basic_id, 'lab_enabled', 'Laboratory Management', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_basic_id, 'abdm_enabled', 'ABDM Digital Health Integration', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (plan_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

    -- Entitlements for STANDARD
    SELECT id INTO v_standard_id FROM public.plans WHERE product_id = v_product_id AND plan_code = 'STANDARD';
    INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at, version)
    VALUES
        (gen_random_uuid(), v_standard_id, 'max_doctors', 'Maximum Doctor Seats', '{"limit": 15}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_standard_id, 'modules', 'Enabled Clinical Modules', '{"modules": ["OPD", "PATIENTS", "BILLING", "PHARMACY", "LAB", "SETTINGS"]}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_standard_id, 'ipd_enabled', 'Inpatient (IPD) Bed Map', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_standard_id, 'pharmacy_enabled', 'Pharmacy Inventory & Expiries', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_standard_id, 'lab_enabled', 'Laboratory Management', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_standard_id, 'abdm_enabled', 'ABDM Digital Health Integration', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (plan_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

    -- Entitlements for PROFESSIONAL
    SELECT id INTO v_pro_id FROM public.plans WHERE product_id = v_product_id AND plan_code = 'PROFESSIONAL';
    INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at, version)
    VALUES
        (gen_random_uuid(), v_pro_id, 'max_doctors', 'Maximum Doctor Seats', '{"limit": 50}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'max_beds', 'Maximum Inpatient Beds', '{"limit": 100}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'modules', 'Enabled Clinical Modules', '{"modules": ["OPD", "PATIENTS", "BILLING", "PHARMACY", "LAB", "SETTINGS", "IPD", "OPERATIONS", "ANALYTICS"]}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'ipd_enabled', 'Inpatient (IPD) Bed Map', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'pharmacy_enabled', 'Pharmacy Inventory & Expiries', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'lab_enabled', 'Laboratory Management', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'ai_analytics', 'AI Predictive Workload Analytics', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_pro_id, 'abdm_enabled', 'ABDM Digital Health Integration', '{"enabled": false}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (plan_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

    -- Entitlements for ENTERPRISE
    INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at, version)
    VALUES
        (gen_random_uuid(), v_enterprise_id, 'max_doctors', 'Maximum Doctor Seats', '{"limit": 500}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'max_beds', 'Maximum Inpatient Beds', '{"limit": 1000}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'modules', 'Enabled Clinical Modules', '{"modules": ["OPD", "PATIENTS", "BILLING", "PHARMACY", "LAB", "SETTINGS", "IPD", "OPERATIONS", "ANALYTICS", "CLINICAL_OPS", "HELP_DESK", "DIGITAL_HEALTH_ABDM", "AI_COPILOT"]}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'ipd_enabled', 'Inpatient (IPD) Bed Map', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'pharmacy_enabled', 'Pharmacy Inventory & Expiries', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'lab_enabled', 'Laboratory Management', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'ai_analytics', 'AI Predictive Workload Analytics', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'abdm_enabled', 'ABDM Digital Health Integration (M1/M2/M3)', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'ai_copilot', 'AI Clinical Co-Pilot & Voice Dictation', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_enterprise_id, 'sla_help_desk', 'Enterprise SLA Help Desk & Equipment Register', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (plan_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

    -- Entitlements for legacy JIOPLIX_ENTERPRISE
    INSERT INTO public.entitlements (id, plan_id, key, name, value, status, created_at, updated_at, version)
    VALUES
        (gen_random_uuid(), v_legacy_enterprise_id, 'max_doctors', 'Maximum Doctor Seats', '{"limit": 500}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'max_beds', 'Maximum Inpatient Beds', '{"limit": 1000}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'modules', 'Enabled Clinical Modules', '{"modules": ["OPD", "PATIENTS", "BILLING", "PHARMACY", "LAB", "SETTINGS", "IPD", "OPERATIONS", "ANALYTICS", "CLINICAL_OPS", "HELP_DESK", "DIGITAL_HEALTH_ABDM", "AI_COPILOT"]}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'ipd_enabled', 'Inpatient (IPD) Bed Map', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'pharmacy_enabled', 'Pharmacy Inventory & Expiries', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'lab_enabled', 'Laboratory Management', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'ai_analytics', 'AI Predictive Workload Analytics', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'abdm_enabled', 'ABDM Digital Health Integration (M1/M2/M3)', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'ai_copilot', 'AI Clinical Co-Pilot & Voice Dictation', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
        (gen_random_uuid(), v_legacy_enterprise_id, 'sla_help_desk', 'Enterprise SLA Help Desk & Equipment Register', '{"enabled": true}'::jsonb, 'ACTIVE'::public.entitlementstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (plan_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

END $$;
