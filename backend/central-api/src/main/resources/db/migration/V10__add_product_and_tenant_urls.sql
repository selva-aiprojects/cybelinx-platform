--
-- Name: V10__add_product_and_tenant_urls.sql
-- Adds base_url to products and app_url to tenant_products subscriptions
--

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_url varchar(256);
ALTER TABLE public.tenant_products ADD COLUMN IF NOT EXISTS app_url varchar(256);

UPDATE public.products SET base_url = 'https://jioplix.com' WHERE product_code = 'JIOPLIX' AND (base_url IS NULL OR base_url = '');
UPDATE public.products SET base_url = 'https://lims-suite.com' WHERE product_code = 'LIMS' AND (base_url IS NULL OR base_url = '');
