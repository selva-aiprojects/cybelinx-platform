-- V7: Add optimistic locking version column to all mutable core entities.
-- These columns are used by Hibernate @Version for optimistic concurrency control,
-- preventing lost-update races on concurrent REST API calls.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tenant_products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tenant_resources ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE provisioning_jobs ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
