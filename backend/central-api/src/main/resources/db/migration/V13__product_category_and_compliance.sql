-- V13: Product category classification & SaaS security compliance extensions

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
        CREATE TYPE public.product_category AS ENUM (
            'REGULATED_MARKETS',
            'ENTERPRISE_OPERATIONS',
            'CORE_PAAS_AI'
        );
    END IF;
END $$;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_category public.product_category NOT NULL DEFAULT 'ENTERPRISE_OPERATIONS';

-- Seed category classifications for registered products
UPDATE public.products SET product_category = 'REGULATED_MARKETS' WHERE product_code IN ('JIOPLIX', 'CYBEHEALTH', 'CYBEBANK', 'CYBEFINTECH');
UPDATE public.products SET product_category = 'CORE_PAAS_AI' WHERE product_code IN ('CYBEAI_SUITE', 'CORE_PAAS');
UPDATE public.products SET product_category = 'ENTERPRISE_OPERATIONS' WHERE product_code NOT IN ('JIOPLIX', 'CYBEHEALTH', 'CYBEBANK', 'CYBEFINTECH', 'CYBEAI_SUITE', 'CORE_PAAS');
