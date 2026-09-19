-- =====================================================================
-- V20: Product Repository registry.
-- Adds deployment/connection metadata to products (domain, database and
-- configuration locations) and a per-customer override table used by the
-- admin portal Product Repository screen.
-- =====================================================================

-- 1. Product repository columns (portal ProductRepositoryView).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS domain varchar(256);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS database_location varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS database_connection_string varchar(512);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS configuration_location varchar(512);

-- 2. Backfill domain from the product base_url when available.
UPDATE public.products
SET domain = SUBSTRING(base_url FROM '^https?://([^/]+)')
WHERE domain IS NULL
  AND base_url IS NOT NULL
  AND base_url <> '';

-- 3. Customer-level overrides (portal ProductRepositoryCustomerView).
CREATE TABLE public.product_repository_customers (
    id uuid NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    product_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    tenant_schema varchar(128),
    database_name varchar(128),
    contact_person varchar(200),
    contact_email varchar(320),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT product_repository_customers_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY public.product_repository_customers
    ADD CONSTRAINT product_repository_customers_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.product_repository_customers
    ADD CONSTRAINT product_repository_customers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX product_repository_customers_product_tenant_key
    ON public.product_repository_customers USING btree (product_id, tenant_id);

CREATE INDEX product_repository_customers_tenant_id_idx
    ON public.product_repository_customers USING btree (tenant_id);