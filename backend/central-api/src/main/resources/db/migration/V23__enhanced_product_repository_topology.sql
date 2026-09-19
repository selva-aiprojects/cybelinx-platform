-- =====================================================================
-- V23: Enhanced Product Repository Topology & Clean State Reset
-- Adds physical and cloud hosting topology columns to public.products,
-- and purges legacy/demo products so operators can register fresh products
-- as the Single Source of Truth.
-- =====================================================================

-- 1. Add enhanced topology columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hosting_provider varchar(64);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deployment_url varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subdomain_pattern varchar(256);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS health_endpoint varchar(256);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS database_provider varchar(64);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS db_url_development varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS db_url_staging varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS db_url_production varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS db_credentials_reference varchar(256);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_isolation_mode varchar(64) DEFAULT 'SCHEMA_PER_TENANT';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS schema_prefix varchar(64);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ddl_template_path varchar(256);

-- 2. Clean wipe of existing products and dependent child records
DELETE FROM public.product_repository_customers;
DELETE FROM public.usage_events;
DELETE FROM public.provisioning_steps;
DELETE FROM public.provisioning_jobs;
DELETE FROM public.tenant_resources;
DELETE FROM public.tenant_products;
DELETE FROM public.tenant_external_identifiers;
DELETE FROM public.entitlements;
DELETE FROM public.plans;

-- Break circular FK constraint on current_version_id before deleting
UPDATE public.products SET current_version_id = NULL;
DELETE FROM public.product_versions;
DELETE FROM public.products;
