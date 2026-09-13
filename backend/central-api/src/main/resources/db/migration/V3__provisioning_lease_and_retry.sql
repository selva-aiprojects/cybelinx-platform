-- V3: Provisioning lease and retry mechanism for distributed workers (Phase 1B Milestone 1)
ALTER TABLE public.provisioning_jobs
    ADD COLUMN IF NOT EXISTS lease_owner character varying(128),
    ADD COLUMN IF NOT EXISTS lease_expires_at timestamp(3) without time zone,
    ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 5 NOT NULL,
    ADD COLUMN IF NOT EXISTS next_retry_at timestamp(3) without time zone;

CREATE INDEX IF NOT EXISTS provisioning_jobs_lease_worker_idx
    ON public.provisioning_jobs USING btree (state, next_retry_at, lease_expires_at);
