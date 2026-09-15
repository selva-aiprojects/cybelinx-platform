-- V14: Portfolio Level Classification — CybeHealth Portfolio Suite & Sub-Products

-- 1. Add portfolio_code column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS portfolio_code varchar(64);

-- 2. Register CYBEHEALTH as a Portfolio Suite
INSERT INTO public.products (id, version, product_code, portfolio_code, name, description, base_url, product_category, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000070',
    0,
    'CYBEHEALTH',
    'CYBEHEALTH',
    'CybeHealth Portfolio Suite',
    'Enterprise Regulated Healthcare & Pharma Portfolio (incorporating Jioplix HMS, LIMS, PACS & Telemedicine)',
    'https://cybelinx.com/products/cybehealth',
    'REGULATED_MARKETS',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'CYBEHEALTH');

-- 3. Associate Sub-Products under CybeHealth Portfolio
UPDATE public.products SET portfolio_code = 'CYBEHEALTH', product_category = 'REGULATED_MARKETS' WHERE product_code IN ('JIOPLIX', 'JIOPLIX_SMART', 'LIMS', 'CYBEHEALTH');
