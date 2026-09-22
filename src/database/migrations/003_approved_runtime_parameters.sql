ALTER TABLE players
ALTER COLUMN cultivation TYPE NUMERIC(30,6)
USING cultivation::NUMERIC(30,6);

ALTER TABLE players
ALTER COLUMN spirit_stones TYPE NUMERIC(30,0)
USING spirit_stones::NUMERIC(30,0);

ALTER TABLE players
ALTER COLUMN sect_points TYPE NUMERIC(30,0)
USING sect_points::NUMERIC(30,0);

ALTER TABLE players
ALTER COLUMN honor_points TYPE NUMERIC(30,0)
USING honor_points::NUMERIC(30,0);

ALTER TABLE players
ALTER COLUMN event_points TYPE NUMERIC(30,0)
USING event_points::NUMERIC(30,0);

ALTER TABLE player_items
ALTER COLUMN quantity TYPE BIGINT
USING quantity::BIGINT;

ALTER TABLE idempotency_records
ADD COLUMN IF NOT EXISTS business_key TEXT,
ADD COLUMN IF NOT EXISTS retention_policy VARCHAR(30) NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS response_expires_at TIMESTAMPTZ;

ALTER TABLE idempotency_records
DROP CONSTRAINT IF EXISTS idempotency_retention_policy_valid;

ALTER TABLE idempotency_records
ADD CONSTRAINT idempotency_retention_policy_valid
CHECK (retention_policy IN ('DEFAULT', 'ONE_TIME_CLAIM'));

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_business_key_unique
ON idempotency_records (player_id, operation_type, business_key)
WHERE business_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idempotency_response_expiry_idx
ON idempotency_records (response_expires_at)
WHERE response_expires_at IS NOT NULL;
