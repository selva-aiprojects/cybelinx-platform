-- V4: Event outbox consumer idempotency and dead-letter tracking (Phase 1B Milestone 3)
ALTER TABLE public.event_processing
    ADD COLUMN IF NOT EXISTS consumer_name character varying(128) DEFAULT 'default' NOT NULL,
    ADD COLUMN IF NOT EXISTS error_stack text,
    ADD COLUMN IF NOT EXISTS dead_letter_at timestamp(3) without time zone;

CREATE UNIQUE INDEX IF NOT EXISTS event_processing_event_consumer_unique
    ON public.event_processing USING btree (event_id, consumer_name);

CREATE INDEX IF NOT EXISTS platform_events_status_pending_idx
    ON public.platform_events USING btree (status, available_at);
