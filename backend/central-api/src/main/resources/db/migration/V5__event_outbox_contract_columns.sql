-- V5: Standard event contract columns (TRD section 20) on platform_events
ALTER TABLE public.platform_events
    ADD COLUMN IF NOT EXISTS occurred_at timestamp(3) without time zone,
    ADD COLUMN IF NOT EXISTS source character varying(64);

UPDATE public.platform_events
SET occurred_at = created_at
WHERE occurred_at IS NULL;

ALTER TABLE public.platform_events
    ALTER COLUMN occurred_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS platform_events_occurred_at_idx
    ON public.platform_events USING btree (occurred_at);