--
-- Name: tenant_mappings; Type: TABLE; Schema: public
-- Maps product-specific or legacy external tenant IDs to Cybelinx Central Platform Tenant UUIDs
--

CREATE TABLE public.tenant_mappings (
    id uuid NOT NULL,
    product_code varchar(64) NOT NULL,
    external_tenant_id varchar(128) NOT NULL,
    cybelinx_tenant_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT tenant_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tenant_mappings_tenant_id_fkey FOREIGN KEY (cybelinx_tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX tenant_mappings_product_external_key ON public.tenant_mappings USING btree (product_code, external_tenant_id);
CREATE INDEX tenant_mappings_cybelinx_tenant_idx ON public.tenant_mappings USING btree (cybelinx_tenant_id);
