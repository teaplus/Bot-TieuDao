ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;

ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS locked_by VARCHAR(160);

ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE outbox_events
ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ;

UPDATE outbox_events
SET available_at = occurred_at
WHERE available_at IS NULL;

ALTER TABLE outbox_events
ALTER COLUMN available_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE outbox_events
ALTER COLUMN available_at SET NOT NULL;

DROP INDEX IF EXISTS outbox_events_pending_idx;

CREATE INDEX IF NOT EXISTS outbox_events_dispatchable_idx
ON outbox_events (available_at, id)
WHERE processed_at IS NULL AND dead_lettered_at IS NULL;

CREATE INDEX IF NOT EXISTS outbox_events_lease_idx
ON outbox_events (locked_at, id)
WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND locked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS outbox_events_dead_letter_idx
ON outbox_events (dead_lettered_at, id)
WHERE dead_lettered_at IS NOT NULL;
