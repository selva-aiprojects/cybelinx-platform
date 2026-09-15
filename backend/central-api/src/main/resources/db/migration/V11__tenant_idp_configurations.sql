-- ---------------------------------------------------------------------
-- V11: Tenant-specific Identity Provider (IAM) Configuration Schema
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_idp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider_type VARCHAR(64) NOT NULL,
    issuer VARCHAR(512),
    jwks_uri VARCHAR(512),
    audience VARCHAR(256),
    client_id VARCHAR(256),
    credential_reference VARCHAR(512),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tenant_idp_configs_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_idp_configs_issuer ON public.tenant_idp_configs(issuer);
